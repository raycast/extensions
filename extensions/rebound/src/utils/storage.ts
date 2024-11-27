export function isJson(item: unknown): boolean {
  let value = typeof item !== "string" ? JSON.stringify(item) : item;
  try {
    value = JSON.parse(value);
  } catch (error) {
    return false;
  }

  return typeof value === "object" && value !== null;
}

export const isObject = (value: unknown): boolean =>
  (typeof value === "object" || Array.isArray(value)) &&
  value !== null &&
  !(value instanceof RegExp) &&
  !(value instanceof Date) &&
  !(value instanceof Set) &&
  !(value instanceof Map);
