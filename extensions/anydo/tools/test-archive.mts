/**
 * Renders a monthly archive from sample data and writes the HTML report to disk, so the Persian
 * report (fonts, colours, chart) can be checked outside Raycast.
 *
 *   npm run test:archive
 */
import { mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buildFontPreviewHtml, renderArchive } from "../src/anydo/archive.ts";
import type { CompletedEntry } from "../src/anydo/history.ts";
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
function checkTruthy(name: string, value: boolean): void {
  checks += 1;
  if (!value) {
    failures += 1;
    console.log(`  ✗ ${name}`);
  } else console.log(`  ✓ ${name}`);
}

const lists = [
  { list_id: "L1", title: "کاری" },
  { list_id: "L2", title: "خرید منزل" },
] as unknown as AnyDoList[];

const monthStart = new Date(2026, 9, 1); // October 2026
const entries: CompletedEntry[] = [];
const titles = [
  "طراحی سایت رامتین ترابر",
  "ارسال فاکتور به مشتری",
  "بکاپ‌گیری از سرور",
  "خرید نان و شیر",
  "تماس با تیم پشتیبانی",
  "بازبینی قرارداد",
  "تعمیر لپ‌تاپ",
  "جلسه‌ی هفتگی",
];
for (let index = 0; index < 26; index++) {
  const day = (index % 26) + 1;
  entries.push({
    id: `task-${index}`,
    title: titles[index % titles.length],
    at: new Date(2026, 9, day, 9 + (index % 8), 30).getTime(),
    listId: index % 3 === 0 ? "L2" : "L1",
  });
}
// one entry from another month must be ignored
entries.push({ id: "old", title: "کار ماه قبل", at: new Date(2026, 8, 20).getTime(), listId: "L1" });

console.log("== monthly archive renderer ==");
const now = new Date(2026, 10, 1, 10, 0);
const rendered = renderArchive({ entries, lists, monthStart, now, font: "Vazirmatn" });

check("count only counts the archived month", rendered.count, 26);
check("file key", rendered.key, "2026-10");
checkTruthy("html is RTL and Persian", rendered.html.includes('dir="rtl"') && rendered.html.includes('lang="fa"'));
checkTruthy("html uses the configured font", rendered.html.includes('font-family: "Vazirmatn"'));
checkTruthy("html links the Persian webfonts", rendered.html.includes("vazirmatn"));
checkTruthy("html groups by list", rendered.html.includes("کاری") && rendered.html.includes("خرید منزل"));
checkTruthy("html has the day chart", rendered.html.includes("نمودار روزهای ماه"));
checkTruthy("html escapes titles", !rendered.html.includes("<script"));
checkTruthy("html mentions the total", rendered.html.includes("۲۶"));
checkTruthy("markdown has both list sections", rendered.markdown.includes("## کاری —") && rendered.markdown.includes("## خرید منزل —"));
checkTruthy("markdown excludes the other month", !rendered.markdown.includes("کار ماه قبل"));
checkTruthy("markdown counts ۲۶", rendered.markdown.includes("**۲۶**"));

console.log("\n== report font handling ==");
const preview = buildFontPreviewHtml(
  { family: "Vazirmatn", dataUrl: null, fileName: null },
  { title: "طراحی سایت رامتین ترابر", lines: ["کارهای امروز ۵", "۱۲۳۴۵۶۷۸۹۰"] },
);
checkTruthy("preview page has the font family", preview.includes('font-family: "Vazirmatn"'));
checkTruthy("preview loads the webfonts", preview.includes("cdn.jsdelivr.net"));
checkTruthy("preview is RTL Persian", preview.includes('dir="rtl"'));
checkTruthy("no @font-face without a file", !preview.includes("@font-face"));

const embedded = buildFontPreviewHtml(
  { family: "IRANSansX", dataUrl: "data:font/ttf;base64,AAAA", fileName: "IRANSansX.ttf" },
  { title: "تست", lines: ["یک خط"] },
);
checkTruthy("embedded font becomes @font-face", embedded.includes('@font-face') && embedded.includes("data:font/ttf;base64,AAAA"));
checkTruthy("embedded font name is shown", embedded.includes("IRANSansX.ttf"));

const previewPath = join(tmpdir(), "anydo-font-preview-vazirmatn.html");
await writeFile(previewPath, preview, "utf8");
console.log(`  → font preview page: ${previewPath}`);

const out = join(tmpdir(), "anydo-archive-sample.html");

await writeFile(out, rendered.html, "utf8");
const size = (await stat(out)).size;
checkTruthy("report written to disk (>8 KB)", size > 8000);
console.log(`  → sample report: ${out} (${size} bytes)`);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.log("ARCHIVE TESTS FAILED");
  process.exit(1);
}
console.log("ARCHIVE TESTS OK");
