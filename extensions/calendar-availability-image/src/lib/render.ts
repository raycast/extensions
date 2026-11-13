import { DayPlan, Interval, Options } from "./types";
import { isoWeek } from "./plan";

const T = {
  title: "Availability",
  week: "Week",
  free: "free",
  busy: "busy",
  tentative: "tentative",
  past: "past",
  asOf: "As of",
  tz: "Times in",
  locale: "en-GB",
};

const C = {
  bg: "#ffffff",
  text: "#111827",
  muted: "#6b7280",
  grid: "#e5e7eb",
  gridStrong: "#d1d5db",
  busy: "#c3c8d0",
  past: "#f3f4f6",
  free: "#dcfce7",
  freeBorder: "#4ade80",
  freeText: "#166534",
  today: "#2563eb",
};

const FONT = "Inter";
const PAD = 28;
const GUTTER = 52;
const HOUR_H = 40;
const DAY_HEAD = 30;
const WEEK_HEAD = 30;
const WEEK_GAP = 22;
const TITLE_H = 54;
const LEGEND_H = 40;

export function renderSvg(
  weeks: DayPlan[][],
  now: Date,
  opts: Options,
): { svg: string; width: number; height: number } {
  const t = T;
  const days = weeks[0].length;
  const colW = days > 5 ? 150 : 200;
  const hours = opts.endHour - opts.startHour;
  const gridW = days * colW;
  const gridH = hours * HOUR_H;
  const weekH = WEEK_HEAD + DAY_HEAD + gridH;
  const width = PAD * 2 + GUTTER + gridW;
  const height = PAD * 2 + TITLE_H + weeks.length * weekH + (weeks.length - 1) * WEEK_GAP + LEGEND_H;

  const p: string[] = [];
  p.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}">`,
    `<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
      `<rect width="8" height="8" fill="#eceef1"/><rect width="4" height="8" fill="${C.busy}"/></pattern></defs>`,
    `<rect width="${width}" height="${height}" fill="${C.bg}"/>`,
  );

  const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const stamp = new Intl.DateTimeFormat(t.locale, { dateStyle: "medium", timeStyle: "short" }).format(now);

  p.push(
    text(PAD, PAD + 22, t.title, { size: 22, weight: 600 }),
    text(width - PAD, PAD + 12, `${t.tz} ${tzName}`, { size: 12, fill: C.muted, anchor: "end" }),
    text(width - PAD, PAD + 29, `${t.asOf}: ${stamp}`, { size: 12, fill: C.muted, anchor: "end" }),
  );

  const fmtTime = (ms: number) => {
    const d = new Date(ms);
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };

  const dayFmt = new Intl.DateTimeFormat(t.locale, { weekday: "short", day: "numeric", month: "numeric" });
  const rangeFmt = new Intl.DateTimeFormat(t.locale, { day: "numeric", month: "short" });
  const todayKey = dateKey(now);

  weeks.forEach((week, wi) => {
    const top = PAD + TITLE_H + wi * (weekH + WEEK_GAP);
    const x0 = PAD + GUTTER;
    const y0 = top + WEEK_HEAD + DAY_HEAD;

    const first = week[0].date;
    const last = week[week.length - 1].date;

    p.push(
      text(PAD, top + 18, `${t.week} ${isoWeek(first)}`, { size: 14, weight: 600 }),
      text(PAD + GUTTER + 20, top + 18, `${rangeFmt.format(first)} – ${rangeFmt.format(last)}`, {
        size: 13,
        fill: C.muted,
      }),
    );

    // Draw hour lines before the blocks so they do not strike through the slot labels.
    for (let h = 0; h <= hours; h++) {
      const y = y0 + h * HOUR_H;
      p.push(`<line x1="${x0}" y1="${y}" x2="${x0 + gridW}" y2="${y}" stroke="${C.grid}" stroke-width="1"/>`);
      p.push(text(x0 - 8, y + 4, `${pad2(opts.startHour + h)}:00`, { size: 11, fill: C.muted, anchor: "end" }));
    }

    week.forEach((day, di) => {
      const x = x0 + di * colW;
      // Use the local clock like the hour lines do; elapsed time would shift blocks on days with a daylight saving change.
      const y = (ms: number) => {
        if (ms >= day.windowEnd) return y0 + gridH;
        const d = new Date(ms);
        const hour = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
        return y0 + Math.min(hours, Math.max(0, hour - opts.startHour)) * HOUR_H;
      };
      const block = (iv: Interval, fill: string) =>
        `<rect x="${x + 1}" y="${r(y(iv.start))}" width="${colW - 1}" height="${r(y(iv.end) - y(iv.start))}" fill="${fill}"/>`;

      const isToday = dateKey(day.date) === todayKey;

      p.push(
        text(x + colW / 2, top + WEEK_HEAD + 19, dayFmt.format(day.date), {
          size: 13,
          weight: isToday ? 600 : 400,
          fill: isToday ? C.today : C.text,
          anchor: "middle",
        }),
      );

      if (day.past) p.push(block(day.past, C.past));
      for (const iv of day.busy) p.push(block(iv, C.busy));
      for (const iv of day.tentative) p.push(block(iv, "url(#hatch)"));

      for (const iv of day.free) {
        const fy = y(iv.start) + 2;
        const fh = y(iv.end) - y(iv.start) - 4;
        p.push(
          `<rect x="${x + 4}" y="${r(fy)}" width="${colW - 7}" height="${r(fh)}" rx="5" fill="${C.free}" stroke="${C.freeBorder}" stroke-width="1"/>`,
        );
        if (fh >= 14) {
          p.push(
            text(x + colW / 2, fy + fh / 2 + 4.5, `${fmtTime(iv.start)} – ${fmtTime(iv.end)}`, {
              size: 13,
              weight: 600,
              fill: C.freeText,
              anchor: "middle",
            }),
          );
        }
      }
    });

    for (let d = 0; d <= days; d++) {
      const x = x0 + d * colW;
      p.push(`<line x1="${x}" y1="${y0}" x2="${x}" y2="${y0 + gridH}" stroke="${C.gridStrong}" stroke-width="1"/>`);
    }
  });

  const ly = height - PAD - 14;
  let lx = PAD + GUTTER;
  const legend = (fill: string, stroke: string | null, label: string) => {
    p.push(
      `<rect x="${lx}" y="${ly}" width="16" height="16" rx="3" fill="${fill}"${stroke ? ` stroke="${stroke}"` : ""}/>`,
      text(lx + 23, ly + 12.5, label, { size: 12, fill: C.muted }),
    );
    lx += 23 + label.length * 6.6 + 26;
  };
  legend(C.free, C.freeBorder, t.free);
  legend(C.busy, null, t.busy);
  if (weeks.some((w) => w.some((d) => d.tentative.length))) legend("url(#hatch)", null, t.tentative);
  if (weeks.some((w) => w.some((d) => d.past))) legend(C.past, C.gridStrong, t.past);

  p.push("</svg>");
  return { svg: p.join("\n"), width, height };
}

function text(
  x: number,
  y: number,
  content: string,
  o: { size: number; weight?: number; fill?: string; anchor?: "start" | "middle" | "end" },
): string {
  return `<text x="${r(x)}" y="${r(y)}" font-size="${o.size}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? C.text}" text-anchor="${o.anchor ?? "start"}">${escapeXml(content)}</text>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function r(n: number): number {
  return Math.round(n * 10) / 10;
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
