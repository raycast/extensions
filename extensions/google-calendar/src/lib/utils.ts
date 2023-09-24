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
