/** Formatiert in lokaler Zeit. toISOString() würde spätabends einen Tag zurückspringen. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + month + "-" + day;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Montag als Wochenanfang. getDay() liefert 0 für Sonntag. */
export function startOfWeek(date: Date): Date {
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
}

export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "2-digit" });
}
