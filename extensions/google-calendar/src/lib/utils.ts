export function stringToDate(text: string | null | undefined) {
  return text ? new Date(text) : undefined;
}

export function nowDate() {
  const n = new Date();
  const r = new Date(extractDateString(n));
  return r;
}

export function extractDateString(date: Date) {
  return date.toISOString().split("T")[0];
}

export function sameDay(d1: Date, d2: Date) {
  return extractDateString(d1) === extractDateString(d2);
}

export function dayOfWeek(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function timeOfDate(date: Date) {
  const t = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return t;
}

export function addDaysToDate(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
