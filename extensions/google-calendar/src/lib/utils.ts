export function stringToDate(text: string | null | undefined) {
  return text ? new Date(text) : undefined;
}

export function nowDate() {
  const n = new Date();
  const r = new Date(n.toISOString().split("T")[0]);
  return r;
}
