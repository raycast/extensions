const CALENDAR_DAY = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/;

function isSameCalendarDay(date: Date, year: number, month: number, day: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function parseCalendarDay(value: string): Date | null {
  const match = CALENDAR_DAY.exec(value);
  if (!match?.groups) return null;
  const year = Number(match.groups.year);
  const month = Number(match.groups.month);
  const day = Number(match.groups.day);
  const date = new Date(year, month - 1, day);
  if (!isSameCalendarDay(date, year, month, day)) return null;
  return date;
}

const FIRST_PICKABLE_YEAR = 2006;

export function pickableDateRange(): { min: Date; max: Date } {
  const year = new Date().getFullYear();
  return {
    min: new Date(FIRST_PICKABLE_YEAR, 0, 1),
    max: new Date(year, 11, 31),
  };
}

export function nextCalendarDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export function formatCalendarDay(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}
