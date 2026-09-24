export type RomanReference = "kalends" | "nones" | "ides";
export type RomanRelation =
  | { kind: "exact" }
  | { kind: "pridie" }
  | { kind: "ante"; count: number }
  | { kind: "bis" };
export type CivilDate = { year: number; month: number; day: number };
export type RomanDate = {
  reference: RomanReference;
  month: number;
  year: number;
  relation: RomanRelation;
};

const months = [
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
const nominative = [
  "Ianuariae",
  "Februariae",
  "Martiae",
  "Apriles",
  "Maiae",
  "Iuniae",
  "Iuliae",
  "Augustae",
  "Septembres",
  "Octobres",
  "Novembres",
  "Decembres",
];
const accusative = [
  "Ianuarias",
  "Februarias",
  "Martias",
  "Apriles",
  "Maias",
  "Iunias",
  "Iulias",
  "Augustas",
  "Septembres",
  "Octobres",
  "Novembres",
  "Decembres",
];
const shortMonths = [
  "Ian.",
  "Feb.",
  "Mart.",
  "Apr.",
  "Mai.",
  "Iun.",
  "Iul.",
  "Aug.",
  "Sept.",
  "Oct.",
  "Nov.",
  "Dec.",
];
const refs = {
  kalends: ["Kalendae", "Kalendas", "Kal."],
  nones: ["Nonae", "Nonas", "Non."],
  ides: ["Idus", "Idus", "Id."],
} as const;
const ordinals: Record<number, string> = {
  3: "tertium",
  4: "quartum",
  5: "quintum",
  6: "sextum",
  7: "septimum",
  8: "octavum",
  9: "nonum",
  10: "decimum",
  11: "undecimum",
  12: "duodecimum",
  13: "tertium decimum",
  14: "quartum decimum",
  15: "quintum decimum",
  16: "sextum decimum",
  17: "septimum decimum",
  18: "duodevicesimum",
  19: "undevicesimum",
};
const numeralPairs: [number, string][] = [
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];
const validYear = (y: number) =>
  Number.isInteger(y) && y !== 0 && Math.abs(y) <= 9999;
const nextYear = (y: number) => (y === -1 ? 1 : y + 1);
const previousYear = (y: number) => (y === 1 ? -1 : y - 1);
export const monthName = (m: number) => months[m - 1];
export const displayYear = (y: number) => (y < 0 ? `${-y} BCE` : `${y} CE`);
export const displayCivil = ({ year, month, day }: CivilDate) =>
  `${day} ${monthName(month)} ${displayYear(year)}`;
export function leap(y: number): boolean {
  const a = y < 0 ? y + 1 : y;
  return a % 4 === 0 && (a % 100 !== 0 || a % 400 === 0);
}
export function daysInMonth(m: number, y: number): number {
  return m === 2 ? (leap(y) ? 29 : 28) : [4, 6, 9, 11].includes(m) ? 30 : 31;
}
const nones = (m: number) => ([3, 5, 7, 10].includes(m) ? 7 : 5);
const ides = (m: number) => ([3, 5, 7, 10].includes(m) ? 15 : 13);
const relation = (count: number): RomanRelation =>
  count === 2 ? { kind: "pridie" } : { kind: "ante", count };
export function toRoman(date: CivilDate): RomanDate {
  const { year: y, month: m, day: d } = date;
  if (
    !validYear(y) ||
    !Number.isInteger(m) ||
    m < 1 ||
    m > 12 ||
    !Number.isInteger(d) ||
    d < 1 ||
    d > daysInMonth(m, y)
  )
    throw new Error(
      "Enter a valid Gregorian date from 9999 BCE to 9999 CE (no year zero).",
    );
  if (d === 1)
    return {
      reference: "kalends",
      month: m,
      year: y,
      relation: { kind: "exact" },
    };
  if (d === nones(m))
    return {
      reference: "nones",
      month: m,
      year: y,
      relation: { kind: "exact" },
    };
  if (d === ides(m))
    return {
      reference: "ides",
      month: m,
      year: y,
      relation: { kind: "exact" },
    };
  if (d < nones(m))
    return {
      reference: "nones",
      month: m,
      year: y,
      relation: relation(nones(m) - d + 1),
    };
  if (d < ides(m))
    return {
      reference: "ides",
      month: m,
      year: y,
      relation: relation(ides(m) - d + 1),
    };
  const month = m === 12 ? 1 : m + 1;
  const year = m === 12 ? nextYear(y) : y;
  const rel =
    m === 2 && leap(y) && d === 24
      ? ({ kind: "bis" } as const)
      : relation(
          daysInMonth(m, y) - d + 2 - (m === 2 && leap(y) && d <= 23 ? 1 : 0),
        );
  return { reference: "kalends", month, year, relation: rel };
}
export function numeral(n: number): string {
  let out = "";
  for (const [v, s] of numeralPairs)
    while (n >= v) {
      out += s;
      n -= v;
    }
  return out;
}
export function formatRoman(
  r: RomanDate,
  abbreviated = false,
  includeYear = true,
): string {
  const ref = refs[r.reference],
    m = r.month - 1;
  const core = abbreviated
    ? r.relation.kind === "exact"
      ? `${ref[2]} ${shortMonths[m]}`
      : r.relation.kind === "pridie"
        ? `prid. ${ref[2]} ${shortMonths[m]}`
        : r.relation.kind === "bis"
          ? "a.d. bis VI Kal. Mart."
          : `a.d. ${numeral(r.relation.count)} ${ref[2]} ${shortMonths[m]}`
    : r.relation.kind === "exact"
      ? `${ref[0]} ${nominative[m]}`
      : r.relation.kind === "pridie"
        ? `pridie ${ref[1]} ${accusative[m]}`
        : r.relation.kind === "bis"
          ? "ante diem bis sextum Kalendas Martias"
          : `ante diem ${ordinals[r.relation.count]} ${ref[1]} ${accusative[m]}`;
  return includeYear ? `${core} ${displayYear(r.year)}` : core;
}
export function toCivil(r: RomanDate): CivilDate {
  const { reference, month: m, year: y, relation: rel } = r;
  if (!Number.isInteger(m) || m < 1 || m > 12 || !(validYear(y) || y === 10000))
    throw new Error("Invalid reference month or year.");
  const anchor =
    reference === "kalends" ? 1 : reference === "nones" ? nones(m) : ides(m);
  const previous = {
    year: m === 1 ? previousYear(y) : y,
    month: m === 1 ? 12 : m - 1,
  };
  const last = daysInMonth(previous.month, previous.year);
  let date: CivilDate;
  if (rel.kind === "exact") date = { year: y, month: m, day: anchor };
  else if (rel.kind === "pridie")
    date =
      reference === "kalends"
        ? { ...previous, day: last }
        : { year: y, month: m, day: anchor - 1 };
  else if (rel.kind === "bis") {
    if (reference !== "kalends" || m !== 3 || !leap(y))
      throw new Error(
        "bis sextum is only valid before the Kalends of March in a leap year.",
      );
    date = { year: y, month: 2, day: 24 };
  } else {
    if (rel.count < 3 || rel.count > 19)
      throw new Error(
        "Invalid inclusive count; use pridie for the preceding day.",
      );
    date =
      reference === "kalends"
        ? {
            ...previous,
            day:
              last -
              rel.count +
              (m === 3 && leap(previous.year) && rel.count >= 7 ? 1 : 2),
          }
        : { year: y, month: m, day: anchor - rel.count + 1 };
  }
  try {
    if (JSON.stringify(toRoman(date)) !== JSON.stringify(r)) throw new Error();
  } catch {
    throw new Error(
      "This Roman date does not correspond to a canonical Gregorian date.",
    );
  }
  return date;
}
const fold = (s: string) => s.toLowerCase().replace(/\.$/, "");
function parseYear(
  text: string,
  fallback: number,
): { body: string; year: number } {
  let body = text.trim(),
    bce = false;
  const era = body.match(/\s+(BCE|BC|CE|AD)$/i);
  if (era) {
    bce = /^(BCE|BC)$/i.test(era[1]);
    body = body.slice(0, era.index).trim();
  }
  const match = body.match(/\s+(-?\d+)$/);
  let year = fallback;
  if (match) {
    year = Number(match[1]);
    body = body.slice(0, match.index).trim();
    if (bce) {
      if (year < 0)
        throw new Error("Use either a negative year or BCE, not both.");
      year = -year;
    }
  } else if (era) throw new Error("Add a year before the era label.");
  if (!(validYear(year) || year === 10000))
    throw new Error(
      "Enter a year from 9999 BCE to 9999 CE, without year zero.",
    );
  return { body, year };
}
export function parseRoman(input: string, fallbackYear: number): RomanDate {
  if (!input.trim()) throw new Error("Enter a Roman date.");
  const { body, year } = parseYear(input, fallbackYear);
  const normalized = body
    .replace(/\ba\s*\.\s*d\s*\./gi, "ad")
    .replace(/\bprid\s*\./gi, "pridie")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = normalized.split(" "),
    lower = words.map(fold);
  let mode: "nom" | "acc" | "abbr",
    referenceToken: string,
    monthToken: string,
    rel: RomanRelation;
  if (lower[0] === "ad") {
    if (words.length !== 4 && words.length !== 5)
      throw new Error("Use a.d. X Kal. Oct. 2026.");
    const bis = lower[1] === "bis";
    if (words.length !== (bis ? 5 : 4))
      throw new Error("Invalid abbreviated Roman date.");
    const index = bis ? 2 : 1;
    const count = parseNumeral(words[index]);
    if (bis && count !== 6) throw new Error("bis sextum requires VI.");
    if (!bis && count === 2)
      throw new Error("Use pridie for the preceding day.");
    rel = bis ? { kind: "bis" } : { kind: "ante", count };
    referenceToken = words[index + 1];
    monthToken = words[index + 2];
    mode = "abbr";
  } else if (lower[0] === "ante") {
    if (lower[1] !== "diem" || words.length < 5)
      throw new Error(
        "Use ante diem followed by an ordinal, a reference, and a month.",
      );
    const bis = lower[2] === "bis";
    if (bis) {
      if (words.length !== 6 || lower[3] !== "sextum")
        throw new Error("Invalid bis sextum date.");
      rel = { kind: "bis" };
    } else {
      const ordinal = lower.slice(2, -2).join(" ");
      const count = Number(
        Object.keys(ordinals).find((k) => ordinals[Number(k)] === ordinal),
      );
      if (!count) throw new Error(`Unknown Latin ordinal: ${ordinal}.`);
      rel = { kind: "ante", count };
    }
    referenceToken = words[words.length - 2];
    monthToken = words[words.length - 1];
    mode = "acc";
  } else if (lower[0] === "pridie") {
    if (words.length !== 3)
      throw new Error("Use pridie followed by a reference and month.");
    referenceToken = words[1];
    monthToken = words[2];
    rel = { kind: "pridie" };
    mode = Object.values(refs).some((v) => fold(v[2]) === lower[1])
      ? "abbr"
      : "acc";
  } else {
    if (words.length !== 2) throw new Error("Use a Roman reference and month.");
    referenceToken = words[0];
    monthToken = words[1];
    rel = { kind: "exact" };
    mode = Object.values(refs).some((v) => fold(v[2]) === lower[0])
      ? "abbr"
      : "nom";
  }
  const reference = (Object.keys(refs) as RomanReference[]).find(
    (k) =>
      fold(refs[k][mode === "nom" ? 0 : mode === "acc" ? 1 : 2]) ===
      fold(referenceToken),
  );
  if (!reference)
    throw new Error(`Unknown Roman reference: ${referenceToken}.`);
  const names =
    mode === "nom" ? nominative : mode === "acc" ? accusative : shortMonths;
  const month = names.findIndex((v) => fold(v) === fold(monthToken)) + 1;
  if (!month) throw new Error(`Unknown Latin month: ${monthToken}.`);
  return { reference, month, year, relation: rel };
}
function parseNumeral(s: string): number {
  const upper = s.toUpperCase();
  let n = 0,
    rest = upper;
  for (const [value, symbol] of numeralPairs)
    while (rest.startsWith(symbol)) {
      n += value;
      rest = rest.slice(symbol.length);
    }
  if (rest || n < 2 || n > 19 || numeral(n) !== upper)
    throw new Error(`Invalid or noncanonical Roman numeral: ${s}.`);
  return n;
}
export function parseCivil(input: string): CivilDate {
  const match = input
    .trim()
    .match(/^(\d{1,2})\s+([A-Za-z]+)\s+(-?\d+)(?:\s+(BCE|BC|CE|AD))?$/i);
  if (!match)
    throw new Error("Use a date such as 21 April 753 BCE or 21 April -753.");
  const month =
    months.findIndex((m) => m.toLowerCase() === match[2].toLowerCase()) + 1;
  if (!month) throw new Error(`Unknown month: ${match[2]}.`);
  let year = Number(match[3]);
  if (match[4] && /^(BCE|BC)$/i.test(match[4])) {
    if (year < 0)
      throw new Error("Use either a negative year or BCE, not both.");
    year = -year;
  }
  const date = { day: Number(match[1]), month, year };
  toRoman(date);
  return date;
}
