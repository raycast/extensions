import { Canvas } from "./canvas";
import { displayWidth, expandTabs, splitLines } from "./width";

export interface Callout {
  target: string;
  note: string;
}

// `target: note`, or `` `target`: note `` when the target itself contains a colon.
const NOTE = /^\s*(?:`([^`]+)`|([^:`]+?))\s*:\s+(.+)$/;

/**
 * Code lines, then `target: note` lines. Notes are read from the bottom up while their target
 * appears in the code above, so code that contains colons itself stays code.
 */
export function parseCallouts(input: string): { code: string[]; callouts: Callout[] } | undefined {
  const lines = splitLines(input.replace(/\s+$/, "")).map((l) => expandTabs(l).trimEnd());
  const callouts: Callout[] = [];
  let end = lines.length;
  while (end > 1) {
    const m = lines[end - 1].match(NOTE);
    if (!m) break;
    const target = (m[1] ?? m[2]).trim();
    if (!lines.slice(0, end - 1).some((l) => l.includes(target))) break;
    callouts.unshift({ target, note: m[3].trim() });
    end--;
  }
  const code = lines.slice(0, end);
  while (code.length && !code[code.length - 1].trim()) code.pop();
  if (!callouts.length || !code.some((l) => l.trim())) return undefined;
  return { code, callouts };
}

/** First whole-word occurrence of the target (so `a` doesn't hit the a in `data`), else any. */
function locate(code: string[], target: string): { line: number; index: number } {
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const word = new RegExp(`(?<![\\w$])${escaped}(?![\\w$])`);
  for (const exact of [true, false]) {
    for (let line = 0; line < code.length; line++) {
      const index = exact ? code[line].search(word) : code[line].indexOf(target);
      if (index >= 0) return { line, index };
    }
  }
  return { line: 0, index: 0 };
}

interface Placed {
  line: number;
  /** Display columns of the target span, and the column its pointer drops from. */
  from: number;
  width: number;
  centre: number;
  note: string;
}

/** Underlines each target (─┬─) and draws labelled pointers below, rightmost first. */
export function renderCallouts(input: string): string {
  const parsed = parseCallouts(input);
  if (!parsed) return "";
  const { code, callouts } = parsed;

  const placed: Placed[] = [];
  for (const c of callouts) {
    const { line, index } = locate(code, c.target);
    const from = displayWidth(code[line].slice(0, index));
    const width = displayWidth(c.target);
    let centre = from + Math.floor((width - 1) / 2);
    // Two targets can't share a pointer column; nudge right within the span if needed.
    while (placed.some((p) => p.line === line && p.centre === centre) && centre < from + width - 1) centre++;
    placed.push({ line, from, width, centre, note: c.note });
  }

  const canvas = new Canvas();
  let row = 0;
  code.forEach((text, i) => {
    canvas.put(row++, 0, text);
    const here = placed.filter((p) => p.line === i).sort((a, b) => b.centre - a.centre);
    if (!here.length) return;
    const underline = row++;
    for (const p of here) {
      canvas.put(underline, p.from, "─".repeat(p.width));
    }
    for (const p of here) canvas.put(underline, p.centre, "┬");
    here.forEach((p, k) => {
      const r = row++;
      // Pointers of targets still waiting for their label pass through this row.
      for (const waiting of here.slice(k + 1)) canvas.put(r, waiting.centre, "│");
      canvas.put(r, p.centre, `╰── ${p.note}`);
    });
  });
  return canvas.toString();
}
