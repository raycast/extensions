function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
