/**
 * Deterministic analyser tests: free-form Persian → title / note / tags / priority / list / date.
 *   npm run test:analyze
 */
import {
  buildPrompt,
  extractJson,
  heuristicAnalysis,
  mergeSuggestion,
  type AnalysisContext,
} from "../src/anydo/analyze.ts";
import type { AnyDoList } from "../src/anydo/types.ts";

let checks = 0;
let failures = 0;
function check(name: string, actual: unknown, expected: unknown): void {
  checks += 1;
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures += 1;
    console.log(`  ✗ ${name}\n      got      ${JSON.stringify(actual)}\n      expected ${JSON.stringify(expected)}`);
  } else console.log(`  ✓ ${name}`);
}
function truthy(name: string, value: boolean): void {
  checks += 1;
  if (!value) {
    failures += 1;
    console.log(`  ✗ ${name}`);
  } else console.log(`  ✓ ${name}`);
}

const names = ["کاری", "کارهای واجب", "خرید منزل", "شخصی", "مالی", "سلامتی", "یادگیری", "خانواده", "سفر"];
const lists = names.map((title, index) => ({ list_id: `L${index}`, title })) as unknown as AnyDoList[];
const ctx: AnalysisContext = {
  lists,
  knownTags: ["کاری", "خرید", "مالی", "سلامتی"],
  defaultListName: "کاری",
};
const now = new Date(2026, 10, 1, 20, 0, 0); // 1 Nov 2026, 20:00 local
const minutesAway = (date: Date | null) =>
  date ? Math.round((date.getTime() - now.getTime()) / 60000) : null;

console.log("== the user's shopping example ==");
const shopping = heuristicAnalysis(
  "خرید خانه شیر 1 بسته خرما 2 بسته پنیر 3 تا بصورت فوری واسه 5 دقیقه آینده",
  { ...ctx, now },
);
console.log(JSON.stringify(shopping, null, 2));
check("title → the shopping list name", shopping.title, "خرید منزل");
check("3 items found", shopping.items.length, 3);
check("item nouns", shopping.items.map((item) => item.noun), ["شیر", "خرما", "پنیر"]);
check("note = 3 emoji lines", shopping.note.split("\n").length, 3);
truthy("note has emoji", /🥛|🌴|🧀/.test(shopping.note));
truthy("note uses Persian digits", /۱/.test(shopping.note) && /۳/.test(shopping.note));
check("priority from «فوری»", shopping.priority, 3);
truthy("tag from content", shopping.tags.includes("خرید"));
check("list", shopping.listTitle, "خرید منزل");
check("date ≈ now + 5 min", minutesAway(shopping.date), 5);
check("time was understood", shopping.hasTime, true);

console.log("\n== «کار تستی واسه 3 دقیقه آینده» ==");
const test = heuristicAnalysis("کار تستی واسه 3 دقیقه آینده", { ...ctx, now });
console.log(JSON.stringify({ title: test.title, priority: test.priority, reason: test.reason }, null, 2));
check("date ≈ now + 3 min", minutesAway(test.date), 3);
truthy("title is clean", test.title.includes("کار تستی") && !test.title.includes("دقیقه"));

console.log("\n== «جلسه با تیم فردا ساعت 10» ==");
const meeting = heuristicAnalysis("جلسه با تیم فردا ساعت 10", { ...ctx, now });
console.log(JSON.stringify({ title: meeting.title, list: meeting.listTitle, tags: meeting.tags, date: meeting.date }, null, 2));
check("list → کاری", meeting.listTitle, "کاری");
check("hour respected", meeting.date?.getHours(), 10);
check("day respected", meeting.date?.getDate(), now.getDate() + 1);
truthy("tag کاری", meeting.tags.includes("کاری"));

console.log("\n== «پرداخت قبض برق 10 آبان» ==");
const bill = heuristicAnalysis("پرداخت قبض برق 10 آبان", { ...ctx, now });
console.log(JSON.stringify({ title: bill.title, list: bill.listTitle, tags: bill.tags }, null, 2));
check("list → مالی", bill.listTitle, "مالی");
truthy("tag مالی", bill.tags.includes("مالی"));
// «۱۰ آبان ۱۴۰۵» is 1 Nov 2026 — the very day of the test clock, so it stays on that day at the
// default 09:00 and simply shows up as already due. The point is that the Jalali day is understood.
check("Jalali day → 10 Aban (1 Nov)", bill.date?.toLocaleDateString("en-CA"), "2026-11-01");
check("default hour applied", bill.date?.getHours(), 9);

console.log("\n== «فوری: تماس با مشتری» ==");
const urgent = heuristicAnalysis("فوری تماس با مشتری", { ...ctx, now });
console.log(JSON.stringify({ title: urgent.title, priority: urgent.priority, list: urgent.listTitle }, null, 2));
check("priority 3", urgent.priority, 3);
truthy("«فوری» is not part of the title", !urgent.title.includes("فوری"));
check("list → کاری", urgent.listTitle, "کاری");

console.log("\n== «دکتر ساعت 5 عصر» ==");
const doctor = heuristicAnalysis("دکتر ساعت 5 عصر", { ...ctx, now });
console.log(JSON.stringify({ title: doctor.title, list: doctor.listTitle, tags: doctor.tags, date: doctor.date }, null, 2));
check("list → سلامتی", doctor.listTitle, "سلامتی");
check("17:00", doctor.date?.getHours(), 17);

console.log("\n== plain item list without a verb ==");
const bare = heuristicAnalysis("1 کیلو گوشت 2 بسته ماکارونی", { ...ctx, now });
console.log(JSON.stringify({ title: bare.title, note: bare.note, items: bare.items.length }, null, 2));
check("2 items", bare.items.length, 2);
check("nouns follow the quantities here", bare.items.map((item) => item.noun), ["گوشت", "ماکارونی"]);
truthy("note built", bare.note.split("\n").length === 2);
truthy("note lists both items", bare.note.includes("گوشت") && bare.note.includes("ماکارونی"));

console.log("\n== AI suggestion merge (validation) ==");
const base = heuristicAnalysis("خرید نان و شیر", { ...ctx, now });
const merged = mergeSuggestion(
  base,
  {
    title: "خرید سریع",
    note: "- 🍞 نان\n- 🥛 شیر",
    tags: ["خرید", "#خانه"],
    priority: 2,
    list: "خرید منزل",
    reason: "هوش مصنوعی",
  },
  { ...ctx, now },
);
check("source = ai", merged.source, "ai");
check("title applied", merged.title, "خرید سریع");
check("priority applied", merged.priority, 2);
check("list applied", merged.listTitle, "خرید منزل");
truthy("tags merged (with # stripped)", merged.tags.includes("خانه") && merged.tags.includes("خرید"));

const rejected = mergeSuggestion(
  base,
  { title: "x", note: "<script>alert(1)</script>", priority: 9, list: "لیست ناموجود" },
  { ...ctx, now },
);
check("bogus list rejected", rejected.listTitle, base.listTitle);
check("bogus priority rejected", rejected.priority, base.priority);
check("html note rejected", rejected.note, base.note);
check("too short title rejected", rejected.title, base.title);

console.log("\n== prompt + json extraction ==");
const prompt = buildPrompt("خرید نان", { ...ctx, now });
truthy("prompt lists the real lists", prompt.includes("خرید منزل") && prompt.includes("کاری"));
truthy("prompt demands JSON", prompt.includes("JSON"));
check("extractJson from prose", extractJson('بفرما: {"title":"t"} — تمام')?.title, "t");
check("extractJson on garbage", extractJson("هیچ jsonی نیست"), null);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.log("ANALYZE TESTS FAILED");
  process.exit(1);
}
console.log("ANALYZE TESTS OK");
