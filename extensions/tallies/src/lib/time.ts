/** Normalize a clock value without UTC conversion or a hidden calendar date. */
export function normalizeTime(value: string): string {
  const input = value.trim();
  if (!input || input === "—") return "";
  const match = /^(0?[1-9]|1[0-2]):([0-5]\d)\s*([ap]m)$/i.exec(input);
  if (!match) throw new Error(`Invalid time “${input}”. Use h:mm AM or h:mm PM.`);
  return `${Number(match[1])}:${match[2]} ${match[3].toUpperCase()}`;
}
export function timeFromDate(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error("Choose a valid time.");
  const hour = date.getHours();
  return `${hour % 12 || 12}:${String(date.getMinutes()).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}
export function dateFromTime(value: string): Date {
  const date = new Date();
  const time = normalizeTime(value);
  if (time) {
    const [clock, period] = time.split(" ");
    const [hours, minutes] = clock.split(":").map(Number);
    date.setHours((hours % 12) + (period === "PM" ? 12 : 0), minutes, 0, 0);
  }
  return date;
}
