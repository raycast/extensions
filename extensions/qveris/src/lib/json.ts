export function parseJsonObject(value: string): Record<string, unknown> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Parameters must be valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Parameters must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
}

export function stringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
