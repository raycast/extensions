export function commaUSStandard(n: string | number): string {
  if (typeof n === "string") n = Number(n);
  if (n.toString().length <= 3) return n.toString();
  return n.toLocaleString("en-US");
}

export function commaINStandard(n: string | number): string {
  if (typeof n === "string") n = Number(n);
  if (n.toString().length <= 4) return n.toString();
  return n.toLocaleString("en-IN");
}
