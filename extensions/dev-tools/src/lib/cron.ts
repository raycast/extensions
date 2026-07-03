// Self-contained cron parser, human-readable describer, and next-run calculator.
//
// Supports standard 5-field cron and 6-field cron with a leading seconds field,
// plus the @yearly/@annually/@monthly/@weekly/@daily/@midnight/@hourly macros,
// names for months (jan–dec) and weekdays (sun–sat), and the `*`, `,`, `-`, `/`
// and `?` operators (including wrap-around ranges like `fri-mon`). Times are
// computed in the local time zone.
//
// Day-of-week is 0–6 with 0 = Sunday (7 is also accepted as Sunday). When BOTH
// the day-of-month and day-of-week fields are restricted, a day matches if
// EITHER matches — the standard Vixie-cron rule.
//
// Quartz-only tokens (`L`, `W`, `#`) and the optional trailing year field are not
// supported; they raise a clear parse error rather than being silently ignored.

export interface CronField {
  /** Sorted, unique set of allowed values for this field. */
  values: number[];
  /** True only for `*` / `?` (matches every value in the field's domain). */
  isWildcard: boolean;
  /** The original text of this field, e.g. "0-30/5" or "mon-fri". */
  raw: string;
}

export interface ParsedCron {
  second: CronField; // 0–59 (defaults to {0} for 5-field expressions)
  minute: CronField; // 0–59
  hour: CronField; // 0–23
  dayOfMonth: CronField; // 1–31
  month: CronField; // 1–12
  dayOfWeek: CronField; // 0–6 (7 normalized to 0)
  hasSeconds: boolean;
  /** day-of-month field is not `*` — see the OR rule in dayMatches(). */
  domRestricted: boolean;
  /** day-of-week field is not `*`. */
  dowRestricted: boolean;
  /** The expression as typed (trimmed). */
  source: string;
  /** The 5/6-field expression actually parsed (macros expanded). */
  normalized: string;
}

export const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const MONTH_ALIASES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const DAY_ALIASES: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

const MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function resolveToken(tok: string, min: number, max: number, aliases?: Record<string, number>): number {
  const t = tok.trim().toLowerCase();
  if (t === "") throw new Error("Missing value.");
  let n: number;
  if (aliases && t in aliases) {
    n = aliases[t];
  } else if (/^\d+$/.test(t)) {
    n = parseInt(t, 10);
  } else {
    throw new Error(`"${tok}" is not a valid value.`);
  }
  if (n < min || n > max) throw new Error(`"${tok}" is out of range (${min}–${max}).`);
  return n;
}

// Parse one comma-separated term: a single value, a range, or any of those with
// a `/step`. `*`/`?` expand to the full domain. Ranges may wrap (lo > hi).
function parsePart(part: string, min: number, max: number, aliases?: Record<string, number>): number[] {
  const slash = part.split("/");
  if (slash.length > 2) throw new Error(`"${part}" has more than one "/".`);

  let step = 1;
  if (slash.length === 2) {
    if (!/^\d+$/.test(slash[1])) throw new Error(`Step "${slash[1]}" must be a positive integer.`);
    step = parseInt(slash[1], 10);
    if (step < 1) throw new Error("Step must be at least 1.");
  }

  const rangeStr = slash[0];
  let lo: number;
  let hi: number;
  let wrap = false;

  if (rangeStr === "*" || rangeStr === "?") {
    lo = min;
    hi = max;
  } else if (rangeStr.includes("-")) {
    const dash = rangeStr.split("-");
    if (dash.length !== 2) throw new Error(`"${rangeStr}" is not a valid range.`);
    lo = resolveToken(dash[0], min, max, aliases);
    hi = resolveToken(dash[1], min, max, aliases);
    if (lo > hi) wrap = true; // e.g. fri-mon
  } else {
    lo = resolveToken(rangeStr, min, max, aliases);
    // `a/step` means "from a to the end, stepping"; a bare `a` is just a.
    hi = slash.length === 2 ? max : lo;
  }

  const out: number[] = [];
  if (!wrap) {
    for (let v = lo; v <= hi; v += step) out.push(v);
  } else {
    for (let v = lo; v <= max; v += step) out.push(v);
    for (let v = min; v <= hi; v += step) out.push(v);
  }
  return out;
}

function parseField(raw: string, min: number, max: number, aliases?: Record<string, number>): CronField {
  const trimmed = raw.trim();
  if (trimmed === "") throw new Error("Empty field.");
  const isWildcard = trimmed === "*" || trimmed === "?";
  const set = new Set<number>();
  for (const part of trimmed.split(",")) {
    if (part.trim() === "") throw new Error(`Empty item in "${raw}".`);
    for (const v of parsePart(part, min, max, aliases)) set.add(v);
  }
  const values = [...set].sort((a, b) => a - b);
  if (values.length === 0) throw new Error(`"${raw}" matches no values.`);
  return { values, isWildcard, raw: trimmed };
}

export function parseCron(expr: string): ParsedCron {
  const trimmed = expr.trim();
  if (!trimmed) throw new Error("Enter a cron expression.");

  let normalized = trimmed;
  if (trimmed.startsWith("@")) {
    const key = trimmed.toLowerCase();
    if (key === "@reboot") throw new Error("@reboot runs once at startup — it has no recurring schedule.");
    const macro = MACROS[key];
    if (!macro) throw new Error(`Unknown macro "${trimmed}".`);
    normalized = macro;
  }

  const fields = normalized.split(/\s+/);
  if (fields.length !== 5 && fields.length !== 6) {
    throw new Error(`Expected 5 fields (or 6 with a leading seconds field), got ${fields.length}.`);
  }

  const hasSeconds = fields.length === 6;
  const base = hasSeconds ? 1 : 0;

  const second: CronField = hasSeconds ? parseField(fields[0], 0, 59) : { values: [0], isWildcard: false, raw: "0" };
  const minute = parseField(fields[base], 0, 59);
  const hour = parseField(fields[base + 1], 0, 23);
  const dayOfMonth = parseField(fields[base + 2], 1, 31);
  const month = parseField(fields[base + 3], 1, 12, MONTH_ALIASES);

  // Day-of-week accepts 7 as a second spelling of Sunday; normalize it to 0.
  const dowField = parseField(fields[base + 4], 0, 7, DAY_ALIASES);
  const dowValues = [...new Set(dowField.values.map((v) => (v === 7 ? 0 : v)))].sort((a, b) => a - b);
  const dayOfWeek: CronField = { values: dowValues, isWildcard: dowField.isWildcard, raw: dowField.raw };

  return {
    second,
    minute,
    hour,
    dayOfMonth,
    month,
    dayOfWeek,
    hasSeconds,
    domRestricted: !dayOfMonth.isWildcard,
    dowRestricted: !dayOfWeek.isWildcard,
    source: trimmed,
    normalized,
  };
}

// ---------------------------------------------------------------------------
// Next-run calculation
// ---------------------------------------------------------------------------

function dayMatches(p: ParsedCron, d: Date): boolean {
  const dom = d.getDate();
  const dow = d.getDay(); // 0 = Sunday
  // Vixie rule: when both are restricted, the day matches if EITHER matches.
  if (p.domRestricted && p.dowRestricted) {
    return p.dayOfMonth.values.includes(dom) || p.dayOfWeek.values.includes(dow);
  }
  if (p.domRestricted) return p.dayOfMonth.values.includes(dom);
  if (p.dowRestricted) return p.dayOfWeek.values.includes(dow);
  return true;
}

/** The first time the schedule fires strictly after `from`, or null if none within ~6 years. */
export function nextRun(p: ParsedCron, from: Date): Date | null {
  const d = new Date(from.getTime());
  if (p.hasSeconds) {
    d.setMilliseconds(0);
    d.setSeconds(d.getSeconds() + 1);
  } else {
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + 1);
  }

  const horizonYear = from.getFullYear() + 6;
  let guard = 0;
  while (guard++ < 1_000_000) {
    if (d.getFullYear() > horizonYear) return null;

    if (!p.month.values.includes(d.getMonth() + 1)) {
      d.setMonth(d.getMonth() + 1, 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!dayMatches(p, d)) {
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      continue;
    }
    if (!p.hour.values.includes(d.getHours())) {
      d.setHours(d.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!p.minute.values.includes(d.getMinutes())) {
      d.setMinutes(d.getMinutes() + 1, 0, 0);
      continue;
    }
    if (p.hasSeconds && !p.second.values.includes(d.getSeconds())) {
      d.setSeconds(d.getSeconds() + 1, 0);
      continue;
    }
    return new Date(d.getTime());
  }
  return null;
}

/** Up to `count` upcoming run times after `from`. */
export function nextRuns(p: ParsedCron, from: Date, count: number): Date[] {
  const out: Date[] = [];
  let cursor = from;
  for (let i = 0; i < count; i++) {
    const n = nextRun(p, cursor);
    if (!n) break;
    out.push(n);
    cursor = n;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Description helpers
// ---------------------------------------------------------------------------

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function andList(items: Array<string | number>): string {
  const a = items.map(String);
  if (a.length <= 1) return a[0] ?? "";
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
}

/** True if the field matches every value in its domain (`*` or an equivalent set). */
function isEvery(field: CronField, min: number, max: number): boolean {
  return field.isWildcard || field.values.length === max - min + 1;
}

/**
 * If the field's values are an even cadence starting at the domain minimum and
 * spanning to the end (a "step over the whole range"), return the step; else null.
 */
function everyStep(field: CronField, min: number, max: number): number | null {
  if (field.isWildcard) return null;
  const v = field.values;
  if (v.length < 2 || v[0] !== min) return null;
  const step = v[1] - v[0];
  if (step <= 1) return null;
  for (let i = 2; i < v.length; i++) {
    if (v[i] - v[i - 1] !== step) return null;
  }
  if (v[v.length - 1] + step <= max) return null; // must reach the end of the domain
  return step;
}

/** If the values form a single contiguous run (e.g. 9,10,11), return its bounds. */
function rangeOf(field: CronField): { start: number; end: number } | null {
  const v = field.values;
  if (field.isWildcard || v.length < 2) return null;
  for (let i = 1; i < v.length; i++) {
    if (v[i] !== v[i - 1] + 1) return null;
  }
  return { start: v[0], end: v[v.length - 1] };
}

function namesList(values: number[], nameOf: (n: number) => string, joiner = "through"): string {
  // Compress consecutive runs into ranges: [1,2,3,5] -> "1 through 3" + "5".
  const runs: [number, number][] = [];
  for (const v of values) {
    const last = runs[runs.length - 1];
    if (last && v === last[1] + 1) last[1] = v;
    else runs.push([v, v]);
  }
  return andList(runs.map(([a, b]) => (a === b ? nameOf(a) : `${nameOf(a)} ${joiner} ${nameOf(b)}`)));
}

// ---------------------------------------------------------------------------
// Per-field breakdown (always precise, used for the "Fields" section)
// ---------------------------------------------------------------------------

export interface FieldInfo {
  label: string;
  expr: string;
  description: string;
}

function numericField(field: CronField, min: number, max: number, unit: string, dayLike = false): string {
  if (isEvery(field, min, max)) return `Every ${unit}`;
  const step = everyStep(field, min, max);
  if (step) return `Every ${step} ${unit}s`;
  const list = namesList(field.values, (n) => String(n));
  return dayLike ? `Day ${list}` : list;
}

export function describeFields(p: ParsedCron): FieldInfo[] {
  const out: FieldInfo[] = [];
  if (p.hasSeconds)
    out.push({ label: "Second", expr: p.second.raw, description: numericField(p.second, 0, 59, "second") });
  out.push({ label: "Minute", expr: p.minute.raw, description: numericField(p.minute, 0, 59, "minute") });
  out.push({ label: "Hour", expr: p.hour.raw, description: numericField(p.hour, 0, 23, "hour") });
  out.push({
    label: "Day of month",
    expr: p.dayOfMonth.raw,
    description: isEvery(p.dayOfMonth, 1, 31) ? "Every day" : numericField(p.dayOfMonth, 1, 31, "day", true),
  });
  out.push({
    label: "Month",
    expr: p.month.raw,
    description: isEvery(p.month, 1, 12) ? "Every month" : namesList(p.month.values, (n) => MONTH_NAMES[n]),
  });
  out.push({
    label: "Day of week",
    expr: p.dayOfWeek.raw,
    description: isEvery(p.dayOfWeek, 0, 6)
      ? "Every day of the week"
      : namesList(p.dayOfWeek.values, (n) => DAY_NAMES[n]),
  });
  return out;
}

/** Whether both day fields constrain the schedule, triggering the OR rule. */
export function dayFieldsAreOr(p: ParsedCron): boolean {
  return !isEvery(p.dayOfMonth, 1, 31) && !isEvery(p.dayOfWeek, 0, 6);
}

// ---------------------------------------------------------------------------
// One-line natural-language summary
// ---------------------------------------------------------------------------

function minuteHourScope(p: ParsedCron, skipMinute = false): string {
  const segs: string[] = [];
  if (!skipMinute && !isEvery(p.minute, 0, 59)) {
    const step = everyStep(p.minute, 0, 59);
    if (step) segs.push(`every ${step} minutes`);
    else if (p.minute.values.length === 1) segs.push(`at minute ${p.minute.values[0]}`);
    else segs.push(`at minutes ${andList(p.minute.values)}`);
  }
  if (!isEvery(p.hour, 0, 23)) {
    const step = everyStep(p.hour, 0, 23);
    const r = rangeOf(p.hour);
    if (step) segs.push(`every ${step} hours`);
    else if (r) segs.push(`between ${pad(r.start)}:00 and ${pad(r.end)}:59`);
    else if (p.hour.values.length === 1)
      segs.push(`between ${pad(p.hour.values[0])}:00 and ${pad(p.hour.values[0])}:59`);
    else segs.push(`during hours ${andList(p.hour.values)}`);
  }
  return segs.length ? ", " + segs.join(", ") : "";
}

function hourScopeText(hr: CronField): string {
  const r = rangeOf(hr);
  if (r) return `every hour from ${r.start} through ${r.end}`;
  if (hr.values.length === 1) return `hour ${hr.values[0]}`;
  return `hours ${andList(hr.values)}`;
}

function secondSuffix(p: ParsedCron): string {
  // A single second value that wasn't folded into a clock time.
  if (!p.hasSeconds || p.second.isWildcard || p.second.values.length !== 1) return "";
  return `, on second ${p.second.values[0]}`;
}

function describeTime(p: ParsedCron): string {
  const { second: sc, minute: mi, hour: hr } = p;
  const minAll = isEvery(mi, 0, 59);
  const hrAll = isEvery(hr, 0, 23);
  const minStep = everyStep(mi, 0, 59);
  const hrStep = everyStep(hr, 0, 23);
  const minSingle = !minAll && mi.values.length === 1;
  const hrSingle = !hrAll && hr.values.length === 1;
  const secAll = p.hasSeconds && isEvery(sc, 0, 59);
  const secStep = p.hasSeconds ? everyStep(sc, 0, 59) : null;
  const secSingle = p.hasSeconds && !secAll && sc.values.length === 1;

  const clock = (h: number, m: number) => `${pad(h)}:${pad(m)}` + (secSingle ? `:${pad(sc.values[0])}` : "");

  // Sub-minute cadence (seconds wildcard, stepped, or a multi-value set): lead with it.
  if (p.hasSeconds && (secAll || secStep || sc.values.length > 1)) {
    let lead: string;
    if (secAll) lead = "every second";
    else if (secStep) lead = `every ${secStep} seconds`;
    else lead = `at seconds ${andList(sc.values)}`;
    return lead + minuteHourScope(p);
  }

  // A specific clock time (HH:MM, plus :SS when seconds are pinned).
  if (hrSingle && minSingle) return `at ${clock(hr.values[0], mi.values[0])}`;

  // Every minute / every N minutes, scoped by the hour field.
  if (minAll) return "every minute" + minuteHourScope(p, true) + secondSuffix(p);
  if (minStep) return `every ${minStep} minutes` + minuteHourScope(p, true) + secondSuffix(p);

  // Minute is a specific set: enumerate concrete clock times when the hours are concrete too.
  if (!hrAll && !hrStep) {
    const combos: string[] = [];
    for (const h of hr.values) for (const m of mi.values) combos.push(clock(h, m));
    if (combos.length <= 12) return "at " + andList(combos);
  }

  // Fallback: "at minute(s) X past <hour scope>".
  const minText = minSingle ? `minute ${mi.values[0]}` : `minutes ${andList(mi.values)}`;
  let scope: string;
  if (hrAll) scope = "past every hour";
  else if (hrStep) scope = `past every ${hrStep} hours`;
  else scope = "past " + hourScopeText(hr);
  return `at ${minText} ${scope}` + secondSuffix(p);
}

function domClauseText(p: ParsedCron): string {
  const step = everyStep(p.dayOfMonth, 1, 31);
  if (step) return `every ${step} days of the month`;
  return `on day ${namesList(p.dayOfMonth.values, (n) => String(n))} of the month`;
}

function describeDayClause(p: ParsedCron): string {
  const domR = !isEvery(p.dayOfMonth, 1, 31);
  const dowR = !isEvery(p.dayOfWeek, 0, 6);
  const domText = domClauseText(p);
  const dowText = `on ${namesList(p.dayOfWeek.values, (n) => DAY_NAMES[n])}`;
  if (domR && dowR) return `${domText} or ${dowText}`;
  if (domR) return domText;
  if (dowR) return dowText;
  return "";
}

function describeDate(p: ParsedCron): string {
  const segs: string[] = [];
  const day = describeDayClause(p);
  if (day) segs.push(day);
  if (!isEvery(p.month, 1, 12)) segs.push(`in ${namesList(p.month.values, (n) => MONTH_NAMES[n])}`);
  return segs.join(", ");
}

/** A single human-readable sentence describing when the schedule fires. */
export function describe(p: ParsedCron): string {
  const sentence = [describeTime(p), describeDate(p)].filter(Boolean).join(", ");
  return capitalize(sentence) + ".";
}
