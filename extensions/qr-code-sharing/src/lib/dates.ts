/** Section title for a day: "Today", "Yesterday", or a localized date. */
export function sectionTitle(date: Date): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Compact date and time, e.g. "15/09/26, 14:20" — narrow enough for a list accessory. */
export function formatDateTime(date: Date): string {
  return date.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

/** Collapses a multi-line value so it fits a list row. */
export function singleLine(content: string): string {
  return content.replace(/\s+/g, " ").trim();
}
