export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

// "08:00 – 17:00" (en-dash) when both present, else undefined
export function renderTimeRange(from: string | null, until: string | null): string | undefined {
  if (from && until) {
    return `${from.substring(0, 5)} – ${until.substring(0, 5)}`;
  }
  return undefined;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

// "Today" | "Tomorrow" | null — caller supplies the fallback label
export function relativeDay(date: Date): "Today" | "Tomorrow" | null {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, tomorrow)) return "Tomorrow";
  return null;
}
