export function parseMetadata(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (trimmed === "") return {};
  const parsed = JSON.parse(trimmed);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Metadata must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

export function stringifyMetadata(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) {
    return "";
  }
  return JSON.stringify(value, null, 2);
}
