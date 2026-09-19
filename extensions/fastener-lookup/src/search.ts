import { FASTENERS, Fastener, Series, System, Thread, Unit, nearestDrill } from "./data";

export type Section = "Tap Drill" | "Clearance Hole" | "Counterbore" | "Thread";
export type Fit = "close" | "normal" | "loose";
export type { Unit };

export const SECTION_ORDER: Section[] = ["Tap Drill", "Clearance Hole", "Counterbore", "Thread"];

export interface Row {
  id: string;
  system: System;
  size: string;
  section: Section;
  fastener: string;
  label: string;
  value: number;
  unit: Unit;
  altValue: number;
  altUnit: Unit;
  drill?: string;
  note?: string;
}

type SizeKind = "number" | "fraction" | "decimal" | "metric" | "bare";

interface Query {
  empty: boolean;
  system?: System;
  kind?: SizeKind;
  sizeNumber?: number;
  tpi?: number;
  pitch?: number;
  series?: Series;
  fit?: Fit;
  sections: Section[];
}

const KEYWORDS: Record<string, (q: Query) => void> = {
  tap: (q) => addSection(q, "Tap Drill"),
  tapping: (q) => addSection(q, "Tap Drill"),
  tapped: (q) => addSection(q, "Tap Drill"),
  tapdrill: (q) => addSection(q, "Tap Drill"),
  clearance: (q) => addSection(q, "Clearance Hole"),
  clear: (q) => addSection(q, "Clearance Hole"),
  cl: (q) => addSection(q, "Clearance Hole"),
  through: (q) => addSection(q, "Clearance Hole"),
  thru: (q) => addSection(q, "Clearance Hole"),
  cbore: (q) => addSection(q, "Counterbore"),
  counterbore: (q) => addSection(q, "Counterbore"),
  counter: (q) => addSection(q, "Counterbore"),
  bore: (q) => addSection(q, "Counterbore"),
  cb: (q) => addSection(q, "Counterbore"),
  shcs: (q) => addSection(q, "Counterbore"),
  socket: (q) => addSection(q, "Counterbore"),
  head: (q) => addSection(q, "Counterbore"),
  thread: (q) => addSection(q, "Thread"),
  threads: (q) => addSection(q, "Thread"),
  major: (q) => addSection(q, "Thread"),
  minor: (q) => addSection(q, "Thread"),
  pitch: (q) => addSection(q, "Thread"),
  tpi: (q) => addSection(q, "Thread"),
  spec: (q) => addSection(q, "Thread"),
  specs: (q) => addSection(q, "Thread"),
  close: (q) => (q.fit = "close"),
  tight: (q) => (q.fit = "close"),
  h12: (q) => (q.fit = "close"),
  normal: (q) => (q.fit = "normal"),
  medium: (q) => (q.fit = "normal"),
  std: (q) => (q.fit = "normal"),
  standard: (q) => (q.fit = "normal"),
  h13: (q) => (q.fit = "normal"),
  loose: (q) => (q.fit = "loose"),
  free: (q) => (q.fit = "loose"),
  h14: (q) => (q.fit = "loose"),
  unc: (q) => (q.series = "coarse"),
  coarse: (q) => (q.series = "coarse"),
  unf: (q) => (q.series = "fine"),
  fine: (q) => (q.series = "fine"),
  metric: (q) => (q.system = "metric"),
  imperial: (q) => (q.system = "imperial"),
  inch: (q) => (q.system = "imperial"),
  inches: (q) => (q.system = "imperial"),
  in: (q) => (q.system = "imperial"),
};

function addSection(q: Query, s: Section) {
  if (!q.sections.includes(s)) q.sections.push(s);
}

export function parse(raw: string): Query {
  const q: Query = { empty: false, sections: [] };
  let s = raw.toLowerCase().replace(/×/g, "x").replace(/["″]/g, " in ").replace(/'/g, "").trim();
  if (!s) return { ...q, empty: true };

  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void): boolean => {
    const m = s.match(re);
    if (!m) return false;
    fn(m);
    s = s.replace(re, " ");
    return true;
  };

  const setSize = (kind: SizeKind, sizeNumber: number, system?: System) => {
    q.kind = kind;
    q.sizeNumber = sizeNumber;
    if (system) q.system = system;
  };

  const matched =
    take(/(\d+(?:\.\d+)?)\s*mm\b/, (m) => setSize("metric", +m[1], "metric")) ||
    take(/\bm\s*(\d+(?:\.\d+)?)(?:\s*(?:x|-)\s*(\d+(?:\.\d+)?))?/, (m) => {
      setSize("metric", +m[1], "metric");
      if (m[2]) q.pitch = +m[2];
    }) ||
    take(/(\d+)\s*\/\s*(\d+)(?:\s*(?:-|x|\s)\s*(\d{1,2})\b)?/, (m) => {
      setSize("fraction", +m[1] / +m[2], "imperial");
      if (m[3]) q.tpi = +m[3];
    }) ||
    take(/#\s*(\d+)(?:\s*(?:-|x)\s*(\d{1,3}))?/, (m) => {
      setSize("number", +m[1], "imperial");
      if (m[2]) q.tpi = +m[2];
    }) ||
    take(/\b(?:number|no\.?|num\.?)\s*(\d+)(?:\s*-\s*(\d{1,3}))?/, (m) => {
      setSize("number", +m[1], "imperial");
      if (m[2]) q.tpi = +m[2];
    }) ||
    take(/\b(\d{1,2})\s*-\s*(\d{1,3})\b/, (m) => {
      setSize("number", +m[1], "imperial");
      q.tpi = +m[2];
    }) ||
    take(/(?<![\d.])(\d*\.\d+)(?![\d.])/, (m) => setSize("decimal", +m[1])) ||
    take(/\b(\d+)\b/, (m) => setSize("bare", +m[1]));
  void matched;

  for (const word of s.split(/[^a-z0-9.]+/).filter(Boolean)) {
    KEYWORDS[word.replace(/\.$/, "")]?.(q);
  }

  if (q.kind === "bare" && q.system === "imperial") q.kind = "decimal";
  if (q.fit) q.sections = ["Clearance Hole"];
  return q;
}

function matchesSize(f: Fastener, q: Query): boolean {
  if (q.sizeNumber === undefined) return true;
  if (q.system && f.system !== q.system) return false;
  const n = q.sizeNumber;
  switch (q.kind) {
    case "number":
      return f.system === "imperial" && f.size === `#${n}`;
    case "fraction":
      return f.system === "imperial" && Math.abs(f.majorDia - n) < 0.0005;
    case "decimal":
      return f.system === "imperial" ? Math.abs(f.majorDia - n) <= 0.003 : f.sizeNumber === n;
    case "metric":
      return f.system === "metric" && f.sizeNumber === n;
    case "bare":
      return f.system === "imperial" ? f.size === `#${n}` : f.sizeNumber === n;
    default:
      return false;
  }
}

function matchesThread(t: Thread, q: Query): boolean {
  if (q.tpi !== undefined && t.tpi !== q.tpi) return false;
  if (q.pitch !== undefined && (t.pitch === undefined || Math.abs(t.pitch - q.pitch) > 0.001)) return false;
  if (q.series && t.series !== q.series) return false;
  return true;
}

const round = (v: number, places: number) => Math.round(v * 10 ** places) / 10 ** places;

function convert(value: number, unit: Unit): { altValue: number; altUnit: Unit } {
  return unit === "in"
    ? { altValue: round(value * 25.4, 2), altUnit: "mm" }
    : { altValue: round(value / 25.4, 4), altUnit: "in" };
}

function metricNote(mm: number): string {
  const d = nearestDrill(mm / 25.4);
  return `≈ ${d.name} drill (${d.dia.toFixed(4)} in)`;
}

function row(f: Fastener, section: Section, fastener: string, label: string, value: number, extra?: Partial<Row>): Row {
  return {
    id: `${f.system}|${fastener}|${section}|${label}`,
    system: f.system,
    size: f.size,
    section,
    fastener,
    label,
    value,
    unit: f.unit,
    ...convert(value, f.unit),
    ...extra,
  };
}

const FIT_LABEL: Record<Fit, string> = { close: "Close Fit", normal: "Normal Fit", loose: "Loose Fit" };
const ISO_GRADE: Record<Fit, string> = { close: "H12", normal: "H13", loose: "H14" };

function clearanceRow(f: Fastener, fit: Fit): Row {
  const hole = f.clearance[fit];
  const label = f.system === "metric" ? `${FIT_LABEL[fit]} (${ISO_GRADE[fit]})` : FIT_LABEL[fit];
  return row(f, "Clearance Hole", f.size, label, hole.dia, {
    drill: hole.name,
    note: f.system === "metric" ? metricNote(hole.dia) : undefined,
  });
}

function tapRow(f: Fastener, t: Thread): Row {
  return row(f, "Tap Drill", t.designation, "Tap Drill", t.tapDrill, {
    drill: t.tapDrillName,
    note: f.system === "metric" ? metricNote(t.tapDrill) : "75% thread",
  });
}

function buildRows(f: Fastener, q: Query): Row[] {
  const threads = f.threads.filter((t) => matchesThread(t, q));
  if ((q.tpi !== undefined || q.pitch !== undefined || q.series) && threads.length === 0) return [];

  const want = (s: Section) => q.sections.length === 0 || q.sections.includes(s);
  const rows: Row[] = [];

  if (q.fit) return [clearanceRow(f, q.fit)];

  if (want("Tap Drill")) rows.push(...threads.map((t) => tapRow(f, t)));

  if (want("Clearance Hole")) {
    rows.push(clearanceRow(f, "close"), clearanceRow(f, "normal"), clearanceRow(f, "loose"));
  }

  if (want("Counterbore") && f.counterbore) {
    const c = f.counterbore;
    const note = f.system === "metric" ? undefined : "Socket head cap screw, ASME B18.3";
    rows.push(
      row(f, "Counterbore", f.size, "Diameter", c.dia, { note: note ?? "Socket head cap screw, ISO 4762" }),
      row(f, "Counterbore", f.size, "Depth", c.depth, { note: "Equals head height; add ~0.010 in / 0.3 mm for flush" }),
      row(f, "Counterbore", f.size, "Head Diameter", c.headDia),
      row(f, "Counterbore", f.size, "Head Height", c.headHeight),
    );
  }

  if (want("Thread")) {
    rows.push(row(f, "Thread", f.size, "Major Diameter", f.majorDia));
    for (const t of threads) {
      if (t.tpi !== undefined) {
        rows.push(
          row(f, "Thread", t.designation, "Pitch", round(1 / t.tpi, 4), { note: `${t.tpi} TPI` }),
          row(f, "Thread", t.designation, "Minor Diameter", round(f.majorDia - 1.0825 / t.tpi, 4), {
            note: "Internal thread, basic",
          }),
        );
      } else if (t.pitch !== undefined) {
        rows.push(
          row(f, "Thread", t.designation, "Pitch", t.pitch),
          row(f, "Thread", t.designation, "Minor Diameter", round(f.majorDia - 1.0825 * t.pitch, 3), {
            note: "Internal thread, basic",
          }),
        );
      }
    }
  }

  return rows;
}

export function search(query: string): Row[] {
  const q = parse(query);
  if (q.empty) return FASTENERS.flatMap((f) => f.threads.map((t) => tapRow(f, t)));

  const matched = FASTENERS.filter((f) => matchesSize(f, q));
  const imperialFirst = [...matched].sort((a, b) => (a.system === b.system ? 0 : a.system === "imperial" ? -1 : 1));
  return imperialFirst.flatMap((f) => buildRows(f, q));
}

export function formatLength(value: number, unit: Unit): string {
  if (unit === "in") return value.toFixed(4);
  const s = value.toFixed(2);
  return s.endsWith("0") ? s.slice(0, -1) : s;
}
