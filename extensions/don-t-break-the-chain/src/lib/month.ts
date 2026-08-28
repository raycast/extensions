export type WeekStart = "saturday" | "sunday" | "monday";

/** Offset of the first column, expressed as a JS day index (0 = Sunday). */
const FIRST_COLUMN: Record<WeekStart, number> = {
  sunday: 0,
  monday: 1,
  saturday: 6,
};

/** A month identified as `YYYY-MM`. Zero padded, so string compare is chronological. */
export type MonthKey = string;

/** A calendar row: 7 slots, `null` where the slot belongs to no day of this month. */
export type WeekRow = (number | null)[];

const SUNDAY_FIRST_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

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

export function monthKeyOf(date: Date): MonthKey {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(key: MonthKey): { year: number; month: number } {
  const [year, month] = key.split("-").map(Number);
  return { year, month: month - 1 };
}

export function isMonthKey(value: unknown): value is MonthKey {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function addMonths(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  return monthKeyOf(new Date(year, month + delta, 1));
}

export function monthLabel(key: MonthKey): string {
  const { year, month } = parseMonthKey(key);
  return `${MONTH_NAMES[month]} ${year}`;
}

export function dayLetters(weekStart: WeekStart): string[] {
  const offset = FIRST_COLUMN[weekStart];
  return SUNDAY_FIRST_LETTERS.map((_, index) => SUNDAY_FIRST_LETTERS[(index + offset) % 7]);
}

/**
 * Lay the month out on a 7-column grid. Slots before the 1st and after the last
 * day stay `null` — days from the neighbouring months are never borrowed.
 */
export function buildWeeks(key: MonthKey, weekStart: WeekStart): WeekRow[] {
  const { year, month } = parseMonthKey(key);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() - FIRST_COLUMN[weekStart] + 7) % 7;

  const weeks: WeekRow[] = [];
  let row: WeekRow = new Array(lead).fill(null);

  for (let day = 1; day <= daysInMonth; day++) {
    row.push(day);
    if (row.length === 7) {
      weeks.push(row);
      row = [];
    }
  }
  if (row.length > 0) {
    weeks.push([...row, ...new Array(7 - row.length).fill(null)]);
  }
  return weeks;
}

/** Length of the run of consecutive marked days ending today (or yesterday, if today isn't marked yet). */
export function currentStreak(marks: Record<MonthKey, number[]>, today = new Date()): number {
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isMarked = (date: Date) => (marks[monthKeyOf(date)] ?? []).includes(date.getDate());

  if (!isMarked(cursor)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (isMarked(cursor)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
