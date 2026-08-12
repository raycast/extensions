import { format } from "date-fns";

const CANONICAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toCanonicalDateString(value?: Date | null): string | null {
  if (!value) {
    return null;
  }

  return format(value, "yyyy-MM-dd");
}

export function fromCanonicalDateString(value?: string | null): Date | null {
  if (!value) {
    return null;
  }

  if (CANONICAL_DATE_PATTERN.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatTaskDate(value?: string | null): string {
  const parsed = fromCanonicalDateString(value);
  if (!parsed) {
    return "Not set";
  }

  const hasTime =
    parsed.getHours() !== 0 || parsed.getMinutes() !== 0 || parsed.getSeconds() !== 0 || parsed.getMilliseconds() !== 0;

  return format(parsed, hasTime ? "MMM d, yyyy h:mm a" : "MMM d, yyyy");
}

export function compareCanonicalDateStrings(left?: string | null, right?: string | null): number {
  const leftDate = fromCanonicalDateString(left);
  const rightDate = fromCanonicalDateString(right);

  if (!leftDate && !rightDate) {
    return 0;
  }

  if (!leftDate) {
    return 1;
  }

  if (!rightDate) {
    return -1;
  }

  const leftCalendarDate = new Date(leftDate.getFullYear(), leftDate.getMonth(), leftDate.getDate());
  const rightCalendarDate = new Date(rightDate.getFullYear(), rightDate.getMonth(), rightDate.getDate());

  return leftCalendarDate.getTime() - rightCalendarDate.getTime();
}
