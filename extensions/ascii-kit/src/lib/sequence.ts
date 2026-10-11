import { displayWidth, graphemes, graphemeWidth, splitLines } from "./width";

export interface Message {
  from: string;
  to: string;
  label: string;
  dashed: boolean;
}

// `Client -> API: request`, `API --> Client: 200 OK` (dashed = reply), `→` works too.
export const MESSAGE = /^\s*(.+?)\s*(-->|->|→|⇢)\s*(.+?)\s*(?::\s*(.*))?$/u;

export function parseSequence(input: string): { lanes: string[]; messages: Message[] } {
  const lanes: string[] = [];
  const messages: Message[] = [];
  for (const line of splitLines(input)) {
    const m = line.match(MESSAGE);
    if (!m) continue;
    const [, from, arrow, to, label = ""] = m;
    for (const lane of [from, to]) if (!lanes.includes(lane)) lanes.push(lane);
    messages.push({ from, to, label: label.trim(), dashed: arrow === "-->" || arrow === "⇢" });
  }
  return { lanes, messages };
}

/** A row of cells; a wide grapheme takes its cell plus an empty filler cell. */
class Row {
  cells: string[];
  constructor(width: number) {
    this.cells = Array(width).fill(" ");
  }
  put(col: number, text: string) {
    let c = col;
    let pending = "";
    for (const g of graphemes(text)) {
      const w = graphemeWidth(g);
      // A zero-width character (ZWSP, joiner) rides along with its neighbour instead of taking a cell.
      if (w === 0) {
        if (c > 0 && c <= this.cells.length) this.cells[c - 1] += g;
        else pending += g;
        continue;
      }
      if (c < 0 || c + w > this.cells.length) break;
      this.cells[c] = pending + g;
      pending = "";
      if (w === 2) this.cells[c + 1] = "";
      c += w;
    }
  }
  toString() {
    return this.cells.join("").trimEnd();
  }
}

export function renderSequence(input: string): string {
  const { lanes, messages } = parseSequence(input);
  if (!lanes.length) return "";
  const nameW = Math.max(...lanes.map(displayWidth));
  const labelW = Math.max(0, ...messages.map((m) => displayWidth(m.label)));
  const gap = Math.max(12, nameW + 2, labelW + 8);
  const offset = Math.floor(displayWidth(lanes[0]) / 2);
  const cols = lanes.map((_, i) => offset + i * gap);
  // Room right of the last lane for its name or a self-call (` ↻ label`, drawn from col + 1).
  const width = cols[cols.length - 1] + Math.max(nameW, labelW + 4);

  const lifelines = () => {
    const r = new Row(width);
    cols.forEach((c) => r.put(c, "│"));
    return r;
  };

  const header = new Row(width);
  lanes.forEach((name, i) => header.put(cols[i] - Math.floor(displayWidth(name) / 2), name));
  const out = [header.toString(), lifelines().toString()];

  for (const m of messages) {
    const r = lifelines();
    const a = cols[lanes.indexOf(m.from)];
    const b = cols[lanes.indexOf(m.to)];
    const label = m.label ? ` ${m.label} ` : "";
    if (a === b) {
      r.put(a + 1, ` ↻ ${m.label}`);
    } else {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const line = m.dashed ? "┄" : "─";
      for (let c = lo + 1; c < hi; c++) r.put(c, cols.includes(c) ? "┼" : line);
      if (b > a) {
        r.put(hi - 1, "►");
        r.put(a + 2, label);
      } else {
        r.put(lo + 1, "◄");
        r.put(hi - 1 - displayWidth(label), label);
      }
    }
    out.push(r.toString());
  }
  out.push(lifelines().toString());
  return out.join("\n");
}
