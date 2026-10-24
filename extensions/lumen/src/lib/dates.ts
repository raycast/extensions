import { LocalStorage } from "@raycast/api";

// Date qualifiers for --dc/--dm args. Windows are relative to "now" (calendar-based);
// months filter to a calendar month. Default codes are English and fully editable in
// Manage Tools (so any language is just a rename — no i18n needed for the grammar).
export interface DateQualifier {
  id: string;
  label: string;
  defaultCode: string;
  kind: "window" | "month";
  monthIndex?: number; // 0-11, for month qualifiers
}

export interface ResolvedQualifier extends DateQualifier {
  code: string;
}

const WINDOWS: DateQualifier[] = [
  { id: "today", label: "Today", defaultCode: "today", kind: "window" },
  { id: "week", label: "This Week", defaultCode: "week", kind: "window" },
  { id: "month", label: "This Month", defaultCode: "month", kind: "window" },
  { id: "year", label: "This Year", defaultCode: "year", kind: "window" },
];

const MONTH_NAMES = [
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
const MONTH_CODES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const MONTHS: DateQualifier[] = MONTH_NAMES.map((label, i) => ({
  id: MONTH_CODES[i],
  label,
  defaultCode: MONTH_CODES[i],
  kind: "month" as const,
  monthIndex: i,
}));

export const DATE_QUALIFIERS: DateQualifier[] = [...WINDOWS, ...MONTHS];

interface QualifierOverride {
  id: string;
  code: string;
}

const KEY = "dateQualifiers";

export async function getDateQualifiers(): Promise<ResolvedQualifier[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  let overrides: QualifierOverride[] = [];
  if (raw) {
    try {
      overrides = JSON.parse(raw) as QualifierOverride[];
    } catch {
      overrides = [];
    }
  }
  return DATE_QUALIFIERS.map((q) => ({ ...q, code: overrides.find((o) => o.id === q.id)?.code ?? q.defaultCode }));
}

export async function saveDateQualifiers(qualifiers: ResolvedQualifier[]): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(qualifiers.map((q) => ({ id: q.id, code: q.code }))));
}

export async function resetDateQualifiers(): Promise<void> {
  await LocalStorage.removeItem(KEY);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Monday-anchored natural week containing `now`.
function inCurrentWeek(date: Date, now: Date): boolean {
  const start = new Date(now);
  const day = (start.getDay() + 6) % 7; // 0 = Monday
  start.setDate(start.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

function windowMatches(id: string, date: Date, now: Date): boolean {
  switch (id) {
    case "today":
      return sameDay(date, now);
    case "week":
      return inCurrentWeek(date, now);
    case "month":
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    case "year":
      return date.getFullYear() === now.getFullYear();
    default:
      return true;
  }
}

// A date passes if it satisfies ALL args (AND). Args are order-free: a 4-digit year, a
// month qualifier (current year unless an explicit year is also given), or a window.
export function dateMatches(date: Date, args: string[], qualifiers: ResolvedQualifier[], now: Date): boolean {
  const years: number[] = [];
  const monthIdx: number[] = [];
  const windows: string[] = [];
  for (const arg of args) {
    if (/^\d{4}$/.test(arg)) {
      years.push(Number(arg));
      continue;
    }
    const q = qualifiers.find((x) => x.code === arg.toLowerCase());
    if (!q) continue; // unknown arg: ignored
    if (q.kind === "window") windows.push(q.id);
    else if (q.monthIndex !== undefined) monthIdx.push(q.monthIndex);
  }

  if (years.length && !years.includes(date.getFullYear())) return false;
  // Bare month implies the current year (unless an explicit year was given).
  if (!years.length && monthIdx.length && date.getFullYear() !== now.getFullYear()) return false;
  if (monthIdx.length && !monthIdx.includes(date.getMonth())) return false;
  for (const w of windows) if (!windowMatches(w, date, now)) return false;
  return true;
}
