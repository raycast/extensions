/**
 * Raycast AI tools can only expose statically describable input schemas.
 * Dynamic Synap profile fields therefore cross the tool boundary as a JSON
 * object string and become a normal property bag only after validation here.
 */
export function parseJsonObject(value: string | undefined, field = "value"): Record<string, unknown> | undefined {
  if (value === undefined || value.trim() === "") return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${field} must be a valid JSON object string.`);
  }

  if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error(`${field} must be a JSON object string.`);
  }

  return parsed as Record<string, unknown>;
}

/** Parse an optional JSON array without weakening the static Raycast tool schema. */
export function parseJsonArray(value: string | undefined, field = "value"): unknown[] | undefined {
  if (value === undefined || value.trim() === "") return undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`${field} must be a valid JSON array string.`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`${field} must be a JSON array string.`);
  }

  return parsed;
}

/** Backward-compatible name for profile-specific property bags. */
export const parsePropertyJson = (value: string | undefined, field = "properties") => parseJsonObject(value, field);
