export function encodeLegacySetting(value: string): string {
  try {
    if (typeof JSON.parse(value) === "string") return value;
  } catch {
    // Earlier versions stored language IDs directly rather than JSON strings.
  }
  return JSON.stringify(value);
}
