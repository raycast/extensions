// Some models reject request parameters that other models accept. Reasoning models,
// for example, reject `max_tokens`, `temperature` and the penalties. The API names the
// rejected parameter in its error, so the provider learns the list per model at runtime
// instead of keeping a list of model names.

// Parameters the request cannot work without. A rejection of one of these is a real error.
const REQUIRED = new Set(["model", "messages", "prompt", "stream"]);

// A rejected parameter that has a newer name gets renamed instead of dropped.
const RENAMED: Record<string, string> = {
  max_tokens: "max_completion_tokens",
};

/** Returns the parameter an API error rejects, if the error is an unsupported parameter or value. */
export function rejectedParam(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("error" in error)) return undefined;
  const detail = error.error;
  if (typeof detail !== "object" || detail === null) return undefined;
  if (!("code" in detail) || !("param" in detail)) return undefined;
  const { code, param } = detail;
  if (code !== "unsupported_parameter" && code !== "unsupported_value") return undefined;
  return typeof param === "string" ? param : undefined;
}

/** Reads the cached list of rejected parameters. A missing or corrupt value counts as none. */
export function parseRejected(stored: string | undefined): string[] {
  try {
    const value: unknown = JSON.parse(stored ?? "[]");
    return Array.isArray(value) ? value.filter((param): param is string => typeof param === "string") : [];
  } catch {
    return [];
  }
}

/** Returns a copy of `body` with each rejected parameter renamed or removed. */
export function withoutRejected(body: Record<string, unknown>, rejected: readonly string[]): Record<string, unknown> {
  const result = { ...body };
  for (const param of rejected) {
    if (!canDrop(result, param)) continue;
    const value = result[param];
    delete result[param];
    const newName = RENAMED[param];
    if (newName && !rejected.includes(newName)) result[newName] = value;
  }
  return result;
}

/** Whether retrying without `param` can fix the request built from `body`. */
export function canDrop(body: Record<string, unknown>, param: string): boolean {
  return param in body && !REQUIRED.has(param);
}
