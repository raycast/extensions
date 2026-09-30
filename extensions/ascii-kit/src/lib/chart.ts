import { Canvas } from "./canvas";
import { measureColumns } from "./columns";
import { displayWidth, padCenter, padEnd, padStart, splitLines } from "./width";

export interface Series {
  labels: string[];
  values: number[];
  /** The value as written (`$800.00`, `12%`), for labelling bars. */
  texts: string[];
  /** A first line that wasn't `label value`, kept as a column header. */
  header?: string;
}

const VALUE = /([-+]?[$€£]?\d[\d,.]*\s?%?)\s*$/;

/** `1,200` and `1.200,5` style separators: a comma followed by exactly 3 digits is thousands. */
export function parseNumber(text: string): number {
  let t = text.replace(/[$€£%\s]/g, "");
  if (t.includes(",") && t.includes("."))
    t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (/,\d{3}(?!\d)/.test(t)) t = t.replace(/,/g, "");
  else t = t.replace(",", ".");
  return Number(t);
}

/**
 * `label value` rows (separated by tab, colon, pipe, comma or spaces), or a single line of
 * numbers. A first line without a trailing number is treated as a header.
 */
export function parseSeries(input: string): Series | undefined {
  const lines = splitLines(input)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return undefined;

  if (lines.length === 1) {
    const parts = lines[0].split(/[\s,;]+/).filter(Boolean);
    if (parts.length >= 2 && parts.every((p) => VALUE.test(p) && p.match(VALUE)![1] === p)) {
      return { labels: parts.map(() => ""), values: parts.map(parseNumber), texts: parts };
    }
    return undefined;
  }

  const rows = lines.map((l) => {
    const m = l.match(VALUE);
    // The number must stand apart from its label: `Launch 2026-10-01` is a date, not -01.
    if (!m || (m.index! > 0 && !/[\s:|,\t]/.test(l[m.index! - 1]))) return undefined;
    const label = l
      .slice(0, m.index)
      .replace(/[\s:|,\t]+$/, "")
      .trim();
    return { label, text: m[1].trim(), value: parseNumber(m[1]) };
  });
  const header = rows[0] ? undefined : lines[0];
  const body = header ? rows.slice(1) : rows;
  if (body.length < 2 || body.some((r) => !r || Number.isNaN(r.value))) return undefined;
  return {
    labels: body.map((r) => r!.label),
    values: body.map((r) => r!.value),
    texts: body.map((r) => r!.text),
    header,
  };
}

const EIGHTHS_H = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];
const EIGHTHS_V = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

/** A horizontal bar of `cells` columns, with eighth-block precision at the end. */
function bar(cells: number): string {
  const eighths = Math.round(cells * 8);
  if (cells > 0 && eighths === 0) return "▏";
  return "█".repeat(Math.floor(eighths / 8)) + EIGHTHS_H[eighths % 8];
}

export function renderBars(input: string, width = 40): string {
  const s = parseSeries(input);
  if (!s) return "";
  const max = Math.max(...s.values, 0) || 1;
  const bars = s.values.map((v) => bar((Math.max(0, v) / max) * width));
  const barWidth = Math.max(...bars.map(displayWidth));
  const rows = s.labels.map((l, i) => [l, bars[i], s.texts[i]]);
  const { widths } = measureColumns(rows);
  return rows.map(([l, b, t]) => `${padEnd(l, widths[0])}  ${padEnd(b, barWidth)} ${t}`.trimEnd()).join("\n");
}

export function renderColumns(input: string, height = 8): string {
  const s = parseSeries(input);
  if (!s) return "";
  const max = Math.max(...s.values, 0) || 1;
  const colWidth = Math.min(8, Math.max(3, ...s.labels.map(displayWidth), ...s.texts.map(displayWidth)));
  const canvas = new Canvas();
  const top = 1; // row 0 holds the tallest value's label
  s.values.forEach((v, i) => {
    const x = i * (colWidth + 1);
    const level = Math.round((Math.max(0, v) / max) * height * 8);
    for (let r = 0; r < height; r++) {
      const fromBottom = height - 1 - r;
      const fill = Math.min(8, Math.max(0, level - fromBottom * 8));
      canvas.put(top + r, x, EIGHTHS_V[fill].repeat(colWidth));
    }
    const valueRow = top + height - Math.ceil(level / 8) - 1;
    canvas.put(Math.max(0, valueRow), x, padCenter(s.texts[i], colWidth));
    const label = s.labels[i];
    const shown = displayWidth(label) > colWidth ? [...label].slice(0, colWidth - 1).join("") + "…" : label;
    canvas.put(top + height + 1, x, padCenter(shown, colWidth));
  });
  canvas.put(top + height, 0, "─".repeat(s.values.length * (colWidth + 1) - 1));
  return canvas.toString().replace(/^\n+/, "");
}

export function renderSparkline(input: string): string {
  const s = parseSeries(input);
  if (!s) return "";
  const min = Math.min(...s.values);
  const max = Math.max(...s.values);
  const spark = s.values
    .map((v) => EIGHTHS_V[max === min ? 4 : 1 + Math.round(((v - min) / (max - min)) * 7)])
    .join("");
  return `${spark}  ${s.texts[s.values.indexOf(min)]}–${s.texts[s.values.indexOf(max)]}`;
}

const fmt = (n: number, decimals: number) => n.toFixed(decimals);

/** An asciichart-style line chart: y-axis with labels, the line drawn with ╭╮╰╯─│. */
export function renderLineChart(input: string, height = 8, targetWidth = 48): string {
  const s = parseSeries(input);
  if (!s || s.values.length < 2) return "";
  // Stretch short series so the line has room: repeat each step `k` columns, interpolated.
  const k = Math.max(1, Math.floor(targetWidth / (s.values.length - 1)));
  const pts: number[] = [];
  for (let i = 0; i < s.values.length - 1; i++) {
    for (let j = 0; j < k; j++) pts.push(s.values[i] + ((s.values[i + 1] - s.values[i]) * j) / k);
  }
  pts.push(s.values[s.values.length - 1]);

  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const ratio = height / range;
  const min2 = Math.round(min * ratio);
  const max2 = Math.round(max * ratio);
  const rows = Math.max(1, max2 - min2);
  // Whole-number labels only when every row step is a whole number; otherwise they round unevenly.
  const decimals = Number.isInteger(range / rows) && s.values.every(Number.isInteger) ? 0 : 1;
  const labels = Array.from({ length: rows + 1 }, (_, y) => fmt(max - (y * range) / rows, decimals));
  const labelWidth = Math.max(...labels.map((l) => l.length));
  const offset = labelWidth + 2;
  const grid = Array.from({ length: rows + 1 }, () => Array(offset + pts.length).fill(" "));
  labels.forEach((l, y) => {
    [...padStart(l, labelWidth)].forEach((ch, i) => (grid[y][i] = ch));
    grid[y][offset - 1] = "┤";
  });
  const yOf = (v: number) => Math.round(v * ratio) - min2;
  grid[rows - yOf(pts[0])][offset - 1] = "┼";
  for (let x = 0; x < pts.length - 1; x++) {
    const y0 = yOf(pts[x]);
    const y1 = yOf(pts[x + 1]);
    const col = offset + x;
    if (y0 === y1) {
      grid[rows - y0][col] = "─";
      continue;
    }
    grid[rows - y1][col] = y0 > y1 ? "╰" : "╭";
    grid[rows - y0][col] = y0 > y1 ? "╮" : "╯";
    for (let y = Math.min(y0, y1) + 1; y < Math.max(y0, y1); y++) grid[rows - y][col] = "│";
  }
  const out = grid.map((r) => r.join("").trimEnd());
  const first = s.labels[0];
  const last = s.labels[s.labels.length - 1];
  if (first || last) {
    const axisWidth = pts.length;
    const gap = Math.max(1, axisWidth - displayWidth(first) - displayWidth(last));
    out.push(" ".repeat(offset) + first + " ".repeat(gap) + last);
  }
  return out.join("\n");
}
