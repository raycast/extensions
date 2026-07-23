import { differenceInCalendarDays, format } from "date-fns";

// OpenTask due dates are wall-clock "YYYY-MM-DD" strings in the user's OpenTask timezone.
// All comparisons happen on those strings (ISO date strings sort lexicographically).

export function todayIn(timezone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    // invalid timezone identifier in settings — fall back to the machine's timezone
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }
}

function toDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00`);
}

export function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function addDays(dateString: string, days: number): string {
  const date = toDate(dateString);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function displayDate(dateString: string, today: string): string {
  if (dateString === today) return "Today";
  if (dateString === addDays(today, 1)) return "Tomorrow";
  if (dateString === addDays(today, -1)) return "Yesterday";
  const date = toDate(dateString);
  const diff = differenceInCalendarDays(date, toDate(today));
  if (diff > 1 && diff < 7) return format(date, "EEEE");
  return format(date, date.getFullYear() === toDate(today).getFullYear() ? "d MMM" : "d MMM yyyy");
}

export function displayTime(time: string, timeFormat?: "12h" | "24h"): string {
  if (timeFormat === "24h") return time;
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, "h:mm a");
}

export function displayDue(due: { date: string; time: string | null }, today: string, timeFormat?: "12h" | "24h") {
  const date = displayDate(due.date, today);
  return due.time ? `${date} ${displayTime(due.time, timeFormat)}` : date;
}
