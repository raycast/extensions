export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseDueDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatRelativeDue(due: string | null | undefined, today: Date): string {
  const date = parseDueDate(due);
  if (!date) return "";

  const dueDay = startOfDay(date);
  const todayDay = startOfDay(today);
  const diffDays = Math.round((dueDay.getTime() - todayDay.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  if (diffDays < -1 && diffDays > -7) {
    return `Last ${date.toLocaleDateString("en-US", { weekday: "short" })}`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function resolveDueOption(option: string, today: Date): string | undefined {
  switch (option) {
    case "today":
      return formatDate(today);
    case "tomorrow":
      return formatDate(addDays(today, 1));
    case "end-of-week":
      return formatDate(upcomingOrSame(today, 0));
    case "next-monday":
      return formatDate(strictlyAfter(today, 1));
    case "in-2-weeks":
      return formatDate(addDays(today, 14));
    case "end-of-month":
      return formatDate(endOfMonth(today));
    default:
      return undefined;
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

export function endOfWeekDate(now: Date): Date {
  return upcomingOrSame(now, 0);
}

function upcomingOrSame(today: Date, targetDayOfWeek: number): Date {
  const diff = (targetDayOfWeek - today.getDay() + 7) % 7;
  return addDays(today, diff);
}

function strictlyAfter(today: Date, targetDayOfWeek: number): Date {
  const diff = (targetDayOfWeek - today.getDay() + 7) % 7 || 7;
  return addDays(today, diff);
}

function endOfMonth(today: Date): Date {
  return new Date(today.getFullYear(), today.getMonth() + 1, 0);
}
