import { environment } from "@raycast/api";
import { Kind, KIND_TITLE, Session } from "./storage";

// Charts and the timer card are SVG images inside the detail markdown. Raycast
// renders them as data URIs, so they can be regenerated every second.

type Palette = { text: string; muted: string; faint: string; track: string; surface: string; accent: string };

const DARK: Palette = {
  text: "#FAFAFA",
  muted: "#A1A1AA",
  faint: "#71717A",
  track: "#2E2E33",
  surface: "#232326",
  accent: "#E5484D",
};
const LIGHT: Palette = {
  text: "#18181B",
  muted: "#52525B",
  faint: "#8B8B93",
  track: "#E4E4E7",
  surface: "#F1F1F3",
  accent: "#D93D42",
};

const pal = () => (environment.appearance === "light" ? LIGHT : DARK);
const FONT = `font-family="Segoe UI Variable Display, Segoe UI, system-ui, sans-serif"`;
const NUM = `style="font-variant-numeric: tabular-nums"`;
const W = 440;

export const MIN = 60_000;

// Calendar math, not fixed 24-hour steps, so daylight-saving changes never shift a day.
export const startOfDay = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

export const addDays = (day: number, n: number) => {
  const d = new Date(day);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime();
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export function image(svg: string) {
  return `![](data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")})`;
}

export function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function duration(ms: number) {
  const m = Math.round(ms / MIN);
  if (m < 60) return `${m}m`;
  return m % 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m / 60}h`;
}

export const hhmm = (t: number) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

function ring(cx: number, cy: number, r: number, width: number, fraction: number, color: string, track: string) {
  const c = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, fraction));
  const arc =
    f <= 0.001
      ? ""
      : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="${width}"/>${arc}`;
}

function dots(cx: number, y: number, done: number, total: number, p: Palette) {
  const gap = 20;
  const start = cx - ((total - 1) * gap) / 2;
  return Array.from({ length: total }, (_, i) => {
    const filled = i < done;
    return `<circle cx="${start + i * gap}" cy="${y}" r="5" fill="${filled ? p.accent : "none"}" stroke="${filled ? p.accent : p.faint}" stroke-width="1.5"/>`;
  }).join("");
}

export interface TimerCard {
  kind: Kind;
  remainingMs: number;
  durationMs: number;
  paused: boolean;
  running: boolean;
  label: string;
  caption: string;
  cycleDone: number;
  cycleLength: number;
}

// Big ring with the countdown, for the running session and the start previews.
export function timerCard(t: TimerCard) {
  const p = pal();
  const color = t.kind === "focus" ? p.accent : p.text;
  const cx = W / 2;
  const fraction = t.running ? t.remainingMs / t.durationMs : 1;
  const status = t.paused ? "PAUSED" : KIND_TITLE[t.kind].toUpperCase();
  const label = t.label ? clip(t.label, 44) : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="340" viewBox="0 0 ${W} 340" ${FONT}>
  ${ring(cx, 138, 116, 12, fraction, t.paused ? p.faint : color, p.track)}
  <text x="${cx}" y="96" text-anchor="middle" font-size="13" font-weight="600" letter-spacing="1.6" fill="${t.paused ? p.muted : color}">${status}</text>
  <text x="${cx}" y="162" text-anchor="middle" font-size="68" font-weight="600" letter-spacing="-1.5" fill="${p.text}" ${NUM}>${clock(t.remainingMs)}</text>
  <text x="${cx}" y="196" text-anchor="middle" font-size="14" fill="${p.muted}">${esc(t.caption)}</text>
  ${dots(cx, 284, t.cycleDone, t.cycleLength, p)}
  ${label ? `<text x="${cx}" y="322" text-anchor="middle" font-size="17" font-weight="500" fill="${p.text}">${esc(label)}</text>` : ""}
</svg>`;
}

// Ring of today's progress toward the daily goal, shown when nothing is running.
export function todayCard(done: number, goal: number, focusedMs: number, streak: number) {
  const p = pal();
  const cx = W / 2;
  const met = done >= goal;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="340" viewBox="0 0 ${W} 340" ${FONT}>
  ${ring(cx, 138, 116, 12, done / goal, p.accent, p.track)}
  <text x="${cx}" y="96" text-anchor="middle" font-size="13" font-weight="600" letter-spacing="1.6" fill="${p.accent}">TODAY</text>
  <text x="${cx}" y="162" text-anchor="middle" font-size="68" font-weight="600" letter-spacing="-1.5" fill="${p.text}" ${NUM}>${done}<tspan font-size="30" fill="${p.faint}" dx="4">/${goal}</tspan></text>
  <text x="${cx}" y="196" text-anchor="middle" font-size="14" fill="${p.muted}">${met ? "Daily goal reached" : `${duration(focusedMs)} focused`}</text>
  <text x="${cx}" y="296" text-anchor="middle" font-size="15" fill="${p.muted}">${streak > 0 ? `${streak}-day streak` : "Start a streak today"}</text>
  <text x="${cx}" y="324" text-anchor="middle" font-size="13" fill="${p.faint}">Type what you will work on, then press Enter</text>
</svg>`;
}

export function tiles(items: { value: string; label: string }[]) {
  const p = pal();
  const gap = 10;
  const w = (W - gap * (items.length - 1)) / items.length;
  const cells = items
    .map((it, i) => {
      const x = i * (w + gap);
      return `<rect x="${x}" y="0" width="${w}" height="84" rx="14" fill="${p.surface}"/>
  <text x="${x + 16}" y="42" font-size="26" font-weight="600" letter-spacing="-0.5" fill="${p.text}" ${NUM}>${esc(it.value)}</text>
  <text x="${x + 16}" y="66" font-size="12.5" fill="${p.muted}">${esc(it.label)}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="84" viewBox="0 0 ${W} 84" ${FONT}>${cells}</svg>`;
}

export function weekBars(days: { label: string; ms: number; today: boolean }[], goalMs: number) {
  const p = pal();
  const top = 44;
  const bottom = 200;
  const max = Math.max(goalMs, ...days.map((d) => d.ms), MIN);
  const slot = W / days.length;
  const bw = 34;
  const y = (ms: number) => bottom - ((bottom - top) * ms) / max;
  const bars = days
    .map((d, i) => {
      const x = i * slot + (slot - bw) / 2;
      const h = bottom - y(d.ms);
      const bar =
        d.ms > 0
          ? `<rect x="${x}" y="${y(d.ms)}" width="${bw}" height="${Math.max(h, 4)}" rx="7" fill="${p.accent}" fill-opacity="${d.today ? 1 : 0.5}"/>`
          : `<rect x="${x}" y="${bottom - 4}" width="${bw}" height="4" rx="2" fill="${p.track}"/>`;
      const value =
        d.ms > 0
          ? `<text x="${x + bw / 2}" y="${y(d.ms) - 8}" text-anchor="middle" font-size="12" fill="${p.muted}" ${NUM}>${duration(d.ms)}</text>`
          : "";
      const label = `<text x="${x + bw / 2}" y="${bottom + 22}" text-anchor="middle" font-size="12.5" font-weight="${d.today ? 600 : 400}" fill="${d.today ? p.text : p.muted}">${d.label}</text>`;
      return bar + value + label;
    })
    .join("");
  const gy = y(goalMs);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="232" viewBox="0 0 ${W} 232" ${FONT}>
  <text x="0" y="18" font-size="15" font-weight="600" fill="${p.text}">Last 7 days</text>
  <line x1="0" x2="${W}" y1="${gy}" y2="${gy}" stroke="${p.faint}" stroke-width="1" stroke-dasharray="3 5"/>
  <text x="${W}" y="18" text-anchor="end" font-size="12" fill="${p.muted}">Goal ${duration(goalMs)} a day</text>
  ${bars}
</svg>`;
}

export function heatmap(counts: Map<number, number>, today: number, weeks = 18) {
  const p = pal();
  const cell = 18;
  const gap = 4;
  const left = 32;
  const top = 32;
  // Columns are weeks starting on Monday; the last column holds today.
  const dow = (new Date(today).getDay() + 6) % 7;
  const start = addDays(today, -(dow + (weeks - 1) * 7));
  const level = (n: number) => (n === 0 ? 0 : n <= 1 ? 0.3 : n <= 3 ? 0.55 : n <= 5 ? 0.8 : 1);
  const square = (x: number, y: number, size: number, o: number, r: number) =>
    o === 0
      ? `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}" fill="${p.track}"/>`
      : `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}" fill="${p.accent}" fill-opacity="${o}"/>`;
  let cells = "";
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d);
      if (day > today) continue;
      const n = counts.get(day) ?? 0;
      cells += square(left + w * (cell + gap), top + d * (cell + gap), cell, level(n), 4);
    }
  }
  const rowLabels = ["Mon", "", "Wed", "", "Fri", "", ""]
    .map((l, d) =>
      l ? `<text x="0" y="${top + d * (cell + gap) + 13}" font-size="11.5" fill="${p.muted}">${l}</text>` : "",
    )
    .join("");
  const legendX = W - 34 - 5 * 15;
  const legend = [0, 0.3, 0.55, 0.8, 1].map((o, i) => square(legendX + i * 15, 8, 11, o, 3)).join("");
  const height = top + 7 * (cell + gap);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${height}" viewBox="0 0 ${W} ${height}" ${FONT}>
  <text x="0" y="18" font-size="15" font-weight="600" fill="${p.text}">Last ${weeks} weeks</text>
  <text x="${legendX - 6}" y="18" text-anchor="end" font-size="11.5" fill="${p.muted}">Less</text>
  ${legend}
  <text x="${W}" y="18" text-anchor="end" font-size="11.5" fill="${p.muted}">More</text>
  ${rowLabels}${cells}
</svg>`;
}

export function hourBars(byHour: number[]) {
  const p = pal();
  const top = 32;
  const bottom = 104;
  const max = Math.max(...byHour, MIN);
  const slot = W / 24;
  const bw = slot - 5;
  const peak = byHour.indexOf(Math.max(...byHour));
  const bars = byHour
    .map((ms, h) => {
      const x = h * slot + 2.5;
      const height = ((bottom - top) * ms) / max;
      return ms > 0
        ? `<rect x="${x}" y="${bottom - Math.max(height, 3)}" width="${bw}" height="${Math.max(height, 3)}" rx="3" fill="${p.accent}" fill-opacity="${h === peak ? 1 : 0.5}"/>`
        : `<rect x="${x}" y="${bottom - 3}" width="${bw}" height="3" rx="1.5" fill="${p.track}"/>`;
    })
    .join("");
  const labels = [0, 6, 12, 18]
    .map(
      (h) =>
        `<text x="${h * slot + 2.5}" y="${bottom + 20}" font-size="12" fill="${p.muted}">${["12 AM", "6 AM", "12 PM", "6 PM"][h / 6]}</text>`,
    )
    .join("");
  const peakText =
    byHour[peak] > 0
      ? `Most focused around ${["12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM", "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM"][peak]}`
      : "No sessions yet";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${bottom + 28}" viewBox="0 0 ${W} ${bottom + 28}" ${FONT}>
  <text x="0" y="18" font-size="15" font-weight="600" fill="${p.text}">Time of day</text>
  <text x="${W}" y="18" text-anchor="end" font-size="12" fill="${p.muted}">${peakText}</text>
  ${bars}${labels}
</svg>`;
}

// One day on a horizontal track, each focus session as a block.
export function dayTimeline(sessions: Session[], dayStart: number) {
  const p = pal();
  const hourOf = (t: number) => (t - dayStart) / (60 * MIN);
  const first = Math.min(8, ...sessions.map((s) => Math.floor(hourOf(s.startedAt))));
  const last = Math.max(20, ...sessions.map((s) => Math.ceil(hourOf(s.endedAt))));
  const from = Math.max(0, first);
  const to = Math.min(24, last);
  const x = (h: number) => ((h - from) / (to - from)) * W;
  const blocks = sessions
    .map((s) => {
      const x1 = x(hourOf(s.endedAt - s.focusedMs));
      const x2 = x(hourOf(s.endedAt));
      return `<rect x="${x1}" y="34" width="${Math.max(x2 - x1, 3)}" height="36" rx="6" fill="${p.accent}" fill-opacity="${s.completed ? 1 : 0.4}"/>`;
    })
    .join("");
  const ticks: string[] = [];
  const step = to - from > 12 ? 3 : 2;
  for (let h = Math.ceil(from / step) * step; h <= to; h += step) {
    const label = h === 0 || h === 24 ? "12 AM" : h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`;
    const anchor = h === from ? "start" : h === to ? "end" : "middle";
    ticks.push(`<line x1="${x(h)}" x2="${x(h)}" y1="74" y2="80" stroke="${p.faint}"/>`);
    ticks.push(`<text x="${x(h)}" y="98" text-anchor="${anchor}" font-size="12" fill="${p.muted}">${label}</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="106" viewBox="0 0 ${W} 106" ${FONT}>
  <text x="0" y="18" font-size="15" font-weight="600" fill="${p.text}">Timeline</text>
  <rect x="0" y="34" width="${W}" height="36" rx="6" fill="${p.track}" fill-opacity="0.6"/>
  ${blocks}${ticks.join("")}
</svg>`;
}
