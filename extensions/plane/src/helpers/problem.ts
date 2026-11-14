/**
 * Error bodies from the Plane API.
 *
 * v2 serves every error as RFC 9457 `application/problem+json`: `{ type, code, detail }`, plus `errors[]`
 * (`{ field, code, message }`) on `400 invalid_request` (developers.plane.so/api-reference/v2/errors).
 * v1 bodies are ad hoc: `{ error }`, `{ detail }`, or `{ field: [messages] }`.
 */

export type ProblemFieldError = { field?: string; code?: string; message?: string };

export type Problem = {
  type: string;
  code: string;
  detail: string;
  errors?: ProblemFieldError[];
};

/** Returns the problem document when `body` has the v2 shape (`type`, `code` and `detail` strings). */
export function parseProblem(body: unknown): Problem | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) return undefined;
  const record = body as Record<string, unknown>;
  if (typeof record.type !== "string" || typeof record.code !== "string" || typeof record.detail !== "string") {
    return undefined;
  }
  const errors = Array.isArray(record.errors)
    ? record.errors
        .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
        .map((entry) => ({
          field: typeof entry.field === "string" ? entry.field : undefined,
          code: typeof entry.code === "string" ? entry.code : undefined,
          message: typeof entry.message === "string" ? entry.message : undefined,
        }))
    : undefined;
  return { type: record.type, code: record.code, detail: record.detail, errors };
}

/** `detail`, followed by each `field: message` pair from `errors[]` (the docs recommend surfacing them verbatim). */
export function formatProblem(problem: Problem): string {
  const fieldErrors = (problem.errors ?? [])
    .map((entry) => [entry.field, entry.message].filter(Boolean).join(": "))
    .filter(Boolean);
  return fieldErrors.length > 0 ? `${problem.detail} (${fieldErrors.join("; ")})` : problem.detail;
}

/** A readable message from a v2 problem document or a v1 error body. */
export function extractErrorMessage(body: unknown): string | undefined {
  const problem = parseProblem(body);
  if (problem) return formatProblem(problem);
  if (!body || typeof body !== "object") return typeof body === "string" && body ? body : undefined;
  const record = body as Record<string, unknown>;
  for (const key of ["error", "detail", "message"]) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  const [firstKey] = Object.keys(record);
  if (firstKey) {
    const value = record[firstKey];
    return `${firstKey}: ${Array.isArray(value) ? value.join(", ") : String(value)}`;
  }
  return undefined;
}

/**
 * Seconds to wait from a `Retry-After` header: either delta-seconds (`"30"`) or an HTTP date.
 * Returns undefined when the header is missing or unparseable.
 */
export function parseRetryAfter(value: string | null | undefined, now: number = Date.now()): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - now) / 1000));
}
