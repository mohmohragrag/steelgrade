// ========== المساعدات ==========
const spec = {
  ST22: { rp: [0, 230], rm: [0, 350], a: [30, 1000], c: [0, 0.12], mn: [0, 0.45], si: [0, 0.4], p: [0, 0.045], s: [0, 0.045] },
  ST24: { rp: [230, 250], rm: [350, 390], a: [26, 1000], c: [0, 0.17], mn: [0, 0.55], si: [0, 0.4], p: [0, 0.045], s: [0, 0.045] },
  ST37: { rp: [230, 260], rm: [360, 400], a: [25, 1000], c: [0, 0.21], mn: [0, 1.2], si: [0, 0.5], p: [0, 0.045], s: [0, 0.045] },
  ST44: { rp: [270, 350], rm: [430, 480], a: [22, 1000], c: [0, 0.26], mn: [0, 1.65], si: [0, 0.6], p: [0, 0.045], s: [0, 0.045] },
  ST52: { rp: [350, 1000], rm: [480, 1000], a: [18, 1000], c: [0, 0.25], mn: [0, 1.6], si: [0, 0.6], p: [0, 0.045], s: [0, 0.045] }
};
const order = ["ST22", "ST24", "ST37", "ST44", "ST52"];

// helpers
const $ = id => document.getElementById(id);
const inRange = (x, [lo, hi]) => x >= lo && x <= hi;
const posInRange = (x, [lo, hi]) => (x - lo) / (hi - lo);
const p20 = ([lo, hi]) => lo + (hi - lo) * 0.2;

// تفسير قيم العناصر
function interpret(key, val, [min, max], name, impact) {
  if (val < min) return `- ${name} (${key}) = ${val} ➜ أقل من الطبيعي → قد يسبب ضعف`;
  if (val > max) return `- ${name} (${key}) = ${val} ➜ أعلى من الطبيعي → ${impact}`;
  const pos = posInRange(val, [min, max]);
  if (pos < 0.2) return `- ${name} (${key}) = ${val} ➜ طبيعي، لكن قليل شوية`;
  if (pos > 0.8) return `- ${name} (${key}) = ${val} ➜ طبيعي، لكن عالي شوية`;
  return `- ${name} (${key}) = ${val} ➜ طبيعي ✅`;
}

// أسباب كيميائية محتملة
function chemRoot(dir, d, lim) {
  const causes = [];
  const isLow = (v, r) => v < p20(r);
  const isHigh = (v, r) => v > r[1] - (r[1] - r[0]) * 0.2;

  if (dir === "low") {
    if (isLow(d.c, lim.c)) causes.push("كربون قليل يخفّض المقاومة");
    if (isLow(d.mn, lim.mn)) causes.push("منجنيز قليل يخفّض الشد");
    if (isHigh(d.p, lim.p) || isHigh(d.s, lim.s)) causes.push("فسفور/كبريت مرتفع يضعف البنية");
  } else {
    if (isHigh(d.c, lim.c)) causes.push("كربون عالي يرفع الصلادة");
    if (isHigh(d.mn, lim.mn)) causes.push("منجنيز عالي يرفع المقاومة");
  }
  if (!causes.length) causes.push("قد يكون السبب معاملة حرارية أو بنية مجهرية مختلفة");
  return causes;
}

// ========== المنطق الرئيسي ==========
function checkSteel() {
  // 1) جمع القيم
  const d = {
    rp: +$("rp").value || 0,
    rm: +$("rm").value || 0,
    a: +$("a").value || 0,
    c: +$("c").value || 0,
    mn: +$("mn").value || 0,
    si: +$("si").value || 0,
    p: +$("p").value || 0,
    s: +$("s").value || 0
  };

  // 2) درجة مطابقة؟
  let match = null;
  for (const [name, lim] of Object.entries(spec)) {
    if (Object.entries(lim).every(([k, r]) => inRange(d[k], r))) {
      match = name;
      break;
    }
  }

  $("result").className = match ? "ok" : "err";
  $("result").textContent = match
    ? `🟢 النوع المتوقع: ${match}`
    : "❌ مافيش درجة مطابقة بالشروط الحالية";

  // 3) المخالفات الميكانيكية + الأسباب
  const near = order.find(g => d.rp <= spec[g].rp[1]) || "ST52";
  const lim = spec[near];
  const mechIssues = [],
    root = [];

  [["rp", "حد الخضوع Rp0.2"], ["rm", "مقاومة الشد Rm"], ["a", "الاستطالة A%"]].forEach(
    ([k, label]) => {
      const [lo, hi] = lim[k];
      if (d[k] < lo) {
        mechIssues.push(`${label} أقل من الحد الأدنى (${d[k]} < ${lo})`);
        root.push(...chemRoot("low", d, lim));
      } else if (d[k] > hi) {
        mechIssues.push(`${label} أعلى من الحد الأقصى (${d[k]} > ${hi})`);
        root.push(...chemRoot("high", d, lim));
      }
    }
  );

  $("root").textContent = mechIssues.length
    ? `🔴 مخالفات ميكانيكية:\n- ${[...new Set(mechIssues)].join(
        "\n- "
      )}\n\n🛠️ أسباب كيميائية محتملة:\n- ${[...new Set(root)].join("\n- ")}`
    : "";

  // 4) تفسير العناصر الكيميائية
  const ex = [];
  ex.push("📊 تفسير تأثير النسب:");
  ex.push(interpret("C", d.c, spec.ST52.c, "الكربون", "بيزود الصلادة ويقلل الليونة"));
  ex.push(
    interpret("Mn", d.mn, spec.ST52.mn, "المنجنيز", "بيعزز الشد بس ممكن يقلل قابلية اللحام")
  );
  ex.push(interpret("Si", d.si, spec.ST52.si, "السيليكون", "بيعزز المقاومة بدون ضرر"));
  ex.push(interpret("P", d.p, spec.ST52.p, "الفسفور", "ارتفاعه يسبب هشاشة"));
  ex.push(interpret("S", d.s, spec.ST52.s, "الكبريت", "زيادته تسبب شروخ وضعف لحام"));
  ex.push(interpret("A%", d.a, [18, 30], "الاستطالة", "تعبر عن ليونة المعدن"));
  $("explain").textContent = ex.join("\n");
}

// ربط الزر بالوظيفة
document.getElementById("checkBtn").addEventListener("click", checkSteel);
