export function isStringArray(val: unknown): val is string[] {
  if (val == null) return false;
  return Array.isArray(val) && val.every((item) => typeof item === "string");
}
