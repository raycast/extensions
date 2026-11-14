import nameDays from "../data/name-days.json";
import names from "../data/names.json";

export const CALENDAR_URL = "https://dovanasuvardu.lt/vardadieniai/";
export const ATTRIBUTION =
  "Data: Lithuanian Wikipedia, cross-checked with day.lt and tv3.lt. Compiled by dovanasuvardu.lt, licensed CC BY-SA 4.0.";

const NAME_DAYS = nameDays as Record<string, string[]>;
const NAMES = names as Record<string, string[]>;

const MONTHS = [
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

export interface Day {
  key: string; // MM-DD
  label: string;
  date: Date; // UTC midnight of the Vilnius calendar date
  names: string[];
}

/** Current calendar date in Europe/Vilnius as a UTC-midnight Date. */
function vilniusToday(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vilnius",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

export function dayFor(date: Date): Day {
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const key = `${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return { key, label: `${MONTHS[m]} ${d}`, date, names: NAME_DAYS[key] ?? [] };
}

export function upcomingDays(count = 8): Day[] {
  const start = vilniusToday();
  return Array.from({ length: count }, (_, i) => dayFor(new Date(start.getTime() + i * 86400000)));
}

export function relativeLabel(index: number, day: Day): string {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  const weekday = day.date.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" });
  return weekday;
}

export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(
      /[ąčęėįšųūž]/gi,
      (c) => ({ ą: "a", č: "c", ę: "e", ė: "e", į: "i", š: "s", ų: "u", ū: "u", ž: "z" })[c.toLowerCase()] ?? c,
    )
    .toLowerCase()
    .trim();
}

export interface NameEntry {
  name: string;
  days: Day[];
}

const INDEX: { name: string; folded: string }[] = Object.keys(NAMES).map((name) => ({ name, folded: fold(name) }));

export function searchNames(query: string): NameEntry[] {
  const q = fold(query);
  if (!q) return [];
  const matches = INDEX.filter((e) => e.folded.includes(q));
  matches.sort((a, b) => {
    const as = a.folded.startsWith(q) ? 0 : 1;
    const bs = b.folded.startsWith(q) ? 0 : 1;
    return as - bs || a.folded.localeCompare(b.folded);
  });
  return matches.slice(0, 50).map((e) => ({
    name: e.name,
    // 2024 is a leap year, so Feb 29 stays valid.
    days: NAMES[e.name].map((key) => {
      const [mm, dd] = key.split("-").map(Number);
      return dayFor(new Date(Date.UTC(2024, mm - 1, dd)));
    }),
  }));
}
