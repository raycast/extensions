import type { CompletedEntry } from "./history";
import {
  dateToJalaali,
  formatJalaliDate,
  formatJalaliDateTime,
  JALALI_MONTHS,
  toPersianDigits,
} from "./jalali";
import { listTitleOf } from "./match";
import type { AnyDoList } from "./types";

export interface ArchiveInput {
  entries: CompletedEntry[];
  lists: AnyDoList[];
  /** First day of the archived month (local time). */
  monthStart: Date;
  now?: Date;
}

export interface ArchiveRenderInput extends ArchiveInput {
  /** Family name for the report; defaults to Vazirmatn. */
  font?: string;
  /** `data:` URL of an embedded font file (the most reliable way to apply IRANSansX). */
  fontDataUrl?: string | null;
}

/** The typography a report is rendered with. */
export interface ReportFont {
  family: string;
  /** `data:` URL of an embedded font file, when the user supplied one. */
  dataUrl: string | null;
  fileName: string | null;
}

export interface RenderedArchive {
  markdown: string;
  html: string;
  count: number;
  /** `YYYY-MM` of the archived month. */
  key: string;
}

/** Verified webfont sources (checked with HTTP 200) — a CDN that Iran can reach. */
const HTML_FONT_LINKS = [
  "https://cdn.jsdelivr.net/npm/@fontsource/vazirmatn/index.css",
  "https://cdn.jsdelivr.net/gh/rastikerdar/sahel-font@v3.4.0/dist/font-face.css",
  "https://cdn.jsdelivr.net/npm/@fontsource/estedad/index.css",
];

/** The @font-face rules used by every report: CDNs first, the embedded file wins when present. */
export function fontFaceCss(family: string, dataUrl?: string | null): string {
  const links = HTML_FONT_LINKS.map((href) => `@import url("${href}");`).join(
    "\n",
  );
  if (!dataUrl) return links;
  return `${links}
@font-face {
  font-family: "${family}";
  src: url("${dataUrl}");
  font-weight: 100 900;
  font-display: swap;
}`;
}

/** Only the rules for a locally supplied font file (the CDNs come in as <link> tags). */
export function embeddedFontFace(
  family: string,
  dataUrl?: string | null,
): string {
  if (!dataUrl) return "";
  return `@font-face {
    font-family: "${family}";
    src: url("${dataUrl}");
    font-weight: 100 900;
    font-display: swap;
  }`;
}

export function fontStack(family: string): string {
  return `"${family}", Vazirmatn, IRANSansX, Sahel, Estedad, Tahoma, "Segoe UI", sans-serif`;
}

/** A small page used by the "preview font" action, so the setting can be verified instantly. */
export function buildFontPreviewHtml(
  font: ReportFont,
  sample: { title: string; lines: string[] },
): string {
  const weekday = "شنبه یک‌شنبه دوشنبه سه‌شنبه چهارشنبه پنجشنبه جمعه";
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<title>پیش‌نمایش فونت گزارش · ${font.family}</title>
<style>
${fontFaceCss(font.family, font.dataUrl)}
  body { margin: 0; padding: 36px 28px 60px; background: radial-gradient(900px 480px at 20% -10%, #3b1d63 0%, transparent 60%), #0d0b16; color: #f3f0ff;
         font-family: ${fontStack(font.family)}; line-height: 2; }
  .wrap { max-width: 860px; margin: 0 auto; }
  h1 { font-size: 30px; margin: 0 0 4px; }
  .sub { color: #b9aee0; margin: 0 0 22px; }
  .card { background: linear-gradient(160deg, rgba(255,255,255,.075), rgba(255,255,255,.025)); border: 1px solid rgba(255,255,255,.11); border-radius: 18px; padding: 18px 20px; margin-bottom: 16px; }
  .row { display: flex; justify-content: space-between; gap: 14px; padding: 7px 0; border-bottom: 1px dashed rgba(255,255,255,.09); }
  .row:last-child { border-bottom: 0; }
  .row b { color: #ffd479; }
  .big { font-size: 26px; }
  .bold { font-weight: 700; }
  .tagline { color: #8f83bd; font-size: 13px; margin-top: 20px; }
  .pill { background: #2b1d4d; border: 1px solid #58409b; color: #d8ccff; border-radius: 999px; padding: 3px 12px; font-size: 13px; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>🔤 پیش‌نمایش فونت گزارش</h1>
    <p class="sub">فونت انتخابی: <span class="pill">${font.family}</span>${
      font.fileName
        ? ` · فایل جاسازی‌شده: <span class="pill">${font.fileName}</span>`
        : " · وب‌فونت (CDN)"
    }</p>
    <section class="card">
      <div class="row"><span>عنوان گزارش</span><b>${sample.title}</b></div>
      ${sample.lines
        .map(
          (line) => `<div class="row"><span>${line}</span><b>${line}</b></div>`,
        )
        .join("")}
    </section>
    <section class="card">
      <p class="big">${sample.title}</p>
      <p class="big bold">${sample.title} — نسخه‌ی پررنگ</p>
      <p>${weekday}</p>
      <p>۱۲۳۴۵۶۷۸۹۰ — نوشتن قرارداد، بازبینی طراحی سایت رامتین ترابر، خرید نان و شیر</p>
    </section>
    <p class="tagline">اگر این متن با فونت «${font.family}» دیده نمی‌شود: داخل رایکست امکان تغییر فونت وجود ندارد — ولی همین گزارش‌های HTML این تنظیم را کامل رعایت می‌کنند. برای اطمینان از اعمال فونت دلخواه، فایل فونت (ttf/otf/woff2) را در تنظیمات «فایل فونت دلخواه» انتخاب کن.</p>
  </div>
</body>
</html>`;
}

function htmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Monthly archive of everything the extension completed, grouped by list, written as both a
 * markdown file and a styled RTL HTML page that uses a real Persian font.
 */

/** Pure renderer — no preferences, no filesystem — so it can be unit tested outside Raycast. */
export function renderArchive({
  entries,
  lists,
  monthStart,
  now = new Date(),
  font,
  fontDataUrl = null,
}: ArchiveRenderInput): RenderedArchive {
  const monthEnd = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    1,
  );
  const inMonth = entries
    .filter(
      (entry) =>
        entry.at >= monthStart.getTime() && entry.at < monthEnd.getTime(),
    )
    .sort((left, right) => left.at - right.at);

  const jalaaliMonth = dateToJalaali(monthStart);
  const monthName = `${JALALI_MONTHS[jalaaliMonth.jm - 1]} ${toPersianDigits(jalaaliMonth.jy)}`;
  const key = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`;
  const fontFamily = font ?? "Vazirmatn";
  const embedded = embeddedFontFace(fontFamily, fontDataUrl);

  const byList = new Map<string, CompletedEntry[]>();
  for (const entry of inMonth) {
    const name = listTitleOf(lists, entry.listId ?? "") || "بدون لیست";
    byList.set(name, [...(byList.get(name) ?? []), entry]);
  }

  const daysInMonth = Math.round(
    (monthEnd.getTime() - monthStart.getTime()) / 86_400_000,
  );
  const perDay = Array.from({ length: daysInMonth }, (_, index) => {
    const dayStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      index + 1,
    ).getTime();
    const dayEnd = dayStart + 86_400_000;
    return inMonth.filter((entry) => entry.at >= dayStart && entry.at < dayEnd)
      .length;
  });
  const peak = Math.max(1, ...perDay);
  const busiest = perDay.indexOf(peak) + 1;

  const markdown = [
    `# 📊 آرشیو ماهانه — ${monthName}`,
    "",
    `- بازه: ${formatJalaliDate(monthStart)} تا ${formatJalaliDate(new Date(monthEnd.getTime() - 1))}`,
    `- تعداد کارهای تمام‌شده: **${toPersianDigits(inMonth.length)}**`,
    `- لیست‌ها: ${[...byList.keys()].map((name) => `${name} (${toPersianDigits(byList.get(name)?.length ?? 0)})`).join(" · ") || "—"}`,
    "",
  ];
  for (const [name, list] of byList) {
    markdown.push(`## ${name} — ${toPersianDigits(list.length)}`);
    for (const entry of list) {
      markdown.push(
        `- ${formatJalaliDate(new Date(entry.at))} — ${entry.title}`,
      );
    }
    markdown.push("");
  }
  markdown.push(
    `> این گزارش از لاگ محلی اکستنشن ساخته شده و فقط کارهایی را دارد که از خود رایکست تیک خورده‌اند.`,
  );

  const cards = [...byList.entries()]
    .map(
      ([name, list]) => `
      <section class="card">
        <header>
          <h2>📁 ${htmlEscape(name)}</h2>
          <span class="pill">${toPersianDigits(list.length)} کار</span>
        </header>
        <ul>
          ${list
            .map(
              (entry) =>
                `<li><time>${htmlEscape(
                  formatJalaliDate(new Date(entry.at)),
                )}</time><span>${htmlEscape(entry.title)}</span></li>`,
            )
            .join("")}
        </ul>
      </section>`,
    )
    .join("");

  const chart = perDay
    .map(
      (count, index) => `
        <div class="col${count === peak && count > 0 ? " top" : ""}" title="روز ${toPersianDigits(
          index + 1,
        )}: ${toPersianDigits(count)}">
          <div class="bar" style="height:${Math.round((count / peak) * 88)}px"></div>
          <span>${toPersianDigits(index + 1)}</span>
        </div>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>آرشیو ماهانه Any.do — ${monthName}</title>
${HTML_FONT_LINKS.map((href) => `<link rel="stylesheet" href="${href}">`).join("\n")}
<style>
${embedded}
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 40px 24px 64px;
    font-family: ${fontStack(fontFamily)};
    background: radial-gradient(1200px 600px at 15% -10%, #3b1d63 0%, transparent 60%),
                radial-gradient(900px 500px at 90% 0%, #12456b 0%, transparent 55%),
                #0d0b16;
    color: #f3f0ff; line-height: 1.9;
  }
  .wrap { max-width: 1000px; margin: 0 auto; }
  h1 { font-size: 32px; margin: 0 0 6px; letter-spacing: -.5px; }
  .sub { color: #b9aee0; margin: 0 0 28px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 26px; }
  .stat {
    background: linear-gradient(160deg, rgba(255,255,255,.10), rgba(255,255,255,.03));
    border: 1px solid rgba(255,255,255,.12); border-radius: 18px; padding: 18px 20px;
  }
  .stat b { display: block; font-size: 30px; color: #ffd479; }
  .stat span { color: #c9c0ea; font-size: 14px; }
  .card {
    background: linear-gradient(160deg, rgba(255,255,255,.075), rgba(255,255,255,.025));
    border: 1px solid rgba(255,255,255,.11); border-radius: 20px; padding: 20px 22px; margin-bottom: 18px;
    box-shadow: 0 18px 40px -28px rgba(0,0,0,.9);
  }
  .card header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .card h2 { font-size: 19px; margin: 0; }
  .pill { background: #2b1d4d; border: 1px solid #58409b; color: #d8ccff; border-radius: 999px; padding: 3px 12px; font-size: 13px; }
  ul { list-style: none; margin: 14px 0 0; padding: 0; }
  li { display: flex; gap: 12px; align-items: baseline; padding: 8px 0; border-bottom: 1px dashed rgba(255,255,255,.09); }
  li:last-child { border-bottom: 0; }
  time { color: #8f83bd; font-size: 13px; min-width: 96px; }
  .chart { display: flex; align-items: flex-end; gap: 3px; height: 120px; padding: 10px 6px 0; overflow-x: auto; }
  .col { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 16px; }
  .bar { width: 12px; border-radius: 6px 6px 2px 2px; background: linear-gradient(180deg, #7c5cff, #3cc8ff); }
  .col.top .bar { background: linear-gradient(180deg, #ffb347, #ff5f6d); box-shadow: 0 0 14px rgba(255,140,90,.55); }
  .col span { font-size: 10px; color: #8f83bd; }
  footer { color: #8f83bd; font-size: 13px; margin-top: 26px; text-align: center; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>📊 آرشیو ماهانه — ${monthName}</h1>
    <p class="sub">بازه‌ی ${htmlEscape(formatJalaliDate(monthStart))} تا ${htmlEscape(
      formatJalaliDate(new Date(monthEnd.getTime() - 1)),
    )} · ساخته‌شده در ${htmlEscape(formatJalaliDateTime(now, true))}</p>
    <div class="stats">
      <div class="stat"><b>${toPersianDigits(inMonth.length)}</b><span>کار تمام‌شده</span></div>
      <div class="stat"><b>${toPersianDigits(byList.size)}</b><span>لیست درگیر</span></div>
      <div class="stat"><b>${toPersianDigits(peak)}</b><span>پرکارترین روز (${toPersianDigits(busiest)})</span></div>
      <div class="stat"><b>${toPersianDigits(Math.round((inMonth.length / Math.max(1, daysInMonth)) * 10) / 10)}</b><span>میانگین روزانه</span></div>
    </div>
    <section class="card">
      <header><h2>📈 نمودار روزهای ماه</h2><span class="pill">اوج: ${toPersianDigits(peak)}</span></header>
      <div class="chart">${chart}</div>
    </section>
    ${cards || '<section class="card"><h2>در این ماه کاری تیک نخورده</h2></section>'}
    <footer>این گزارش از لاگ محلی اکستنشن Any.do در رایکست ساخته شده است.</footer>
  </div>
</body>
</html>`;

  return { markdown: markdown.join("\n"), html, count: inMonth.length, key };
}

/** Writes the archived month next to the other logs (`anydo-archive-YYYY-MM.md` + `.html`). */
