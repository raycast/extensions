import { renderBox } from "./box";
import { sideBySide } from "./layout";
import { parseTable } from "./table";
import { displayWidth, padEnd, splitLines } from "./width";

// ── Gantt ────────────────────────────────────────────────────────────────

export interface Task {
  label: string;
  /** In units, 1-based: week 1, sprint 3. */
  start: number;
  length: number;
}

const NUM = "(\\d+(?:[.,]\\d+)?)";
// `Design 1-3` / `Design 1–3` / `Design 1..3`: units 1 to 3 inclusive.
const RANGE = new RegExp(`^(.*?)[\\s:\\t]+${NUM}\\s*(?:-|–|—|\\.\\.)\\s*${NUM}\\s*$`);
// `Design 1 3`: starts at unit 1, lasts 3 units.
const START_LENGTH = new RegExp(`^(.*?)[\\s:\\t]+${NUM}[\\s\\t]+${NUM}\\s*$`);
const num = (s: string) => Number(s.replace(",", "."));

/** A first line that is a single word (`Sprint`, `Week`, `Quarter`) names the unit. */
export function parseGantt(input: string): { unit: string; tasks: Task[] } | undefined {
  const lines = splitLines(input)
    .map((l) => l.trim())
    .filter(Boolean);
  let unit = "W";
  if (lines.length && /^[A-Za-z]+$/.test(lines[0])) unit = lines.shift()![0].toUpperCase();
  const tasks: Task[] = [];
  for (const line of lines) {
    const r = line.match(RANGE);
    const s = r ? undefined : line.match(START_LENGTH);
    if (r) {
      const [a, b] = [num(r[2]), num(r[3])];
      const inclusive = Number.isInteger(a) && Number.isInteger(b) ? 1 : 0;
      tasks.push({ label: r[1].trim(), start: a, length: b - a + inclusive });
    } else if (s) {
      tasks.push({ label: s[1].trim(), start: num(s[2]), length: num(s[3]) });
    } else {
      return undefined;
    }
  }
  // A label needs a letter: `3 5 9 14 12` is a series of numbers, not a task called "3 5 9".
  if (!tasks.length || tasks.some((t) => !/\p{L}/u.test(t.label) || t.length <= 0 || t.start < 1)) return undefined;
  return { unit, tasks };
}

/** A year of weeks. The chart grows with the numbers, so `Design 1 5000000` must not be drawn. */
export const MAX_GANTT_UNITS = 52;

/** How many units the chart spans: up to the end of the last task. */
export function ganttSpan(tasks: Task[]): number {
  return Math.ceil(Math.max(...tasks.map((t) => t.start - 1 + t.length)));
}

const EIGHTHS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];

/** Units as columns (W1 W2 …), each task a bar; part-units end in an eighth block. */
export function renderGantt(input: string, unitWidth = 4): string {
  const g = parseGantt(input);
  if (!g) return "";
  const units = ganttSpan(g.tasks);
  if (units > MAX_GANTT_UNITS) return "";
  const labelWidth = Math.max(...g.tasks.map((t) => displayWidth(t.label)));
  const header = Array.from({ length: units }, (_, i) => padEnd(`${g.unit}${i + 1}`, unitWidth)).join("");
  const rows = g.tasks.map((t) => {
    // Bars start on a whole cell; the end gets eighth-block precision.
    const startCell = Math.round((t.start - 1) * unitWidth);
    const eighths = Math.round(t.length * unitWidth * 8);
    const bar = "█".repeat(Math.floor(eighths / 8)) + EIGHTHS[eighths % 8];
    return `${padEnd(t.label, labelWidth)}  ${" ".repeat(startCell)}${bar}`;
  });
  return [" ".repeat(labelWidth + 2) + header.trimEnd(), ...rows].join("\n");
}

// ── Timeline ─────────────────────────────────────────────────────────────

export interface Milestone {
  when: string;
  what: string;
}

/**
 * `date: label`, `date:label`, `date<tab>label`, or `date label` where the date is the first word.
 * A colon between two-digit numbers is a time (`09:00 Standup`), not the separator.
 */
export function parseTimeline(input: string): Milestone[] {
  return splitLines(input)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^([^\t]{1,20}?)\s*(?::(?!\d{2}\b)|\t)\s*(.+)$/) ?? l.match(/^(\S+)\s+(.+)$/);
      return m ? { when: m[1].trim(), what: m[2].trim() } : { when: "", what: l };
    });
}

/** `──●──────●──────●──►` with dates and labels under each dot, evenly spaced. */
export function renderTimelineHorizontal(input: string): string {
  const ms = parseTimeline(input);
  if (ms.length < 2) return "";
  const widths = ms.map((m) => Math.max(8, displayWidth(m.when), displayWidth(m.what)) + 3);
  const track = "──" + ms.map((_, i) => "●" + "─".repeat(widths[i] - 1)).join("") + "►";
  const row = (pick: (m: Milestone) => string) =>
    ("  " + ms.map((m, i) => padEnd(pick(m), widths[i])).join("")).trimEnd();
  return [track, row((m) => m.when), row((m) => m.what)].join("\n");
}

/** Dates in a column on the left, a vertical line with a dot per milestone. */
export function renderTimelineVertical(input: string): string {
  const ms = parseTimeline(input);
  if (ms.length < 2) return "";
  const w = Math.max(...ms.map((m) => displayWidth(m.when)));
  const out: string[] = [];
  ms.forEach((m, i) => {
    out.push(`${padEnd(m.when, w)}  ● ${m.what}`);
    if (i < ms.length - 1) out.push(`${" ".repeat(w)}  │`);
  });
  out.push(`${" ".repeat(w)}  ▼`);
  return out.join("\n");
}

/** Whether every first word looks like a date: 2026-03, Q1, W12, Jan, 12.3., Mar 12, 09:30. */
export function looksLikeTimeline(input: string): boolean {
  const ms = parseTimeline(input);
  const MONTH = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?";
  const DATE = new RegExp(
    `^(\\d{4}(-\\d{1,2}){0,2}|(?:Q[1-4]|H[12])( \\d{4})?|[WS]\\d{1,2}|${MONTH}( \\d{1,2})?( \\d{4})?|\\d{1,2}[./]\\d{1,2}\\.?(\\d{2,4})?|\\d{1,2}:\\d{2})$`,
    "i",
  );
  return ms.length >= 2 && ms.every((m) => DATE.test(m.when));
}

// ── Kanban ───────────────────────────────────────────────────────────────

/** Table columns become board columns: header = column title, cells = cards. */
export function renderKanban(input: string): string {
  const rows = parseTable(input);
  if (rows.length < 2 || rows[0].length < 2) return "";
  const columns = rows[0].map((title, c) => ({
    title,
    cards: rows
      .slice(1)
      .map((r) => r[c])
      .filter(Boolean),
  }));
  const height = Math.max(...columns.map((c) => c.cards.length));
  const boxes = columns.map((c) => {
    const inner = Math.max(displayWidth(c.title) + 2, ...c.cards.map(displayWidth), 10);
    return renderBox(c.cards.join("\n"), { title: c.title, minWidth: inner, minHeight: height });
  });
  return sideBySide(boxes, " ");
}
