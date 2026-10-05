/**
 * Raycast Form.FilePicker stores `string[]`; drafts/setValue may store a plain string.
 * Normalize either shape to a single path (or empty).
 */
export function normalizeDirectoryFormValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return "";
}

export function deriveNameFromDirectory(directory: string): string {
  const trimmed = directory.trim().replace(/[\\/]+$/, "");
  if (!trimmed) {
    return "";
  }
  const segments = trimmed.split(/[\\/]/).filter(Boolean);
  if (segments.length === 0) {
    return trimmed;
  }
  return segments[segments.length - 1] ?? trimmed;
}

export function deriveAbbreviationFromName(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(0, 32);
}
