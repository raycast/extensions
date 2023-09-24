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
