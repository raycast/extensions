/*
 * Utility helpers for safely parsing JSON from potentially noisy stdout/stderr.
 */

/**
 * Remove ANSI escape codes from a string.
 */
export function stripAnsi(input: string): string {
  // Regex to strip ANSI escape sequences
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /\u001b\[[0-?]*[ -/]*[@-~]/g;
  return input.replace(ansiRegex, "");
}

/**
 * Attempt to extract the first complete JSON array or object from a string.
 * Falls back to the original input if no brackets are found.
 */
export function extractJsonEnvelope(input: string): string {
  const firstBrace = input.indexOf("{");
  const firstBracket = input.indexOf("[");
  let start = -1;
  let end = -1;

  // Prefer arrays for yabai queries
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    start = firstBracket;
    end = input.lastIndexOf("]");
  } else if (firstBrace !== -1) {
    start = firstBrace;
    end = input.lastIndexOf("}");
  }

  if (start !== -1 && end !== -1 && end > start) {
    return input.slice(start, end + 1);
  }
  return input;
}

/**
 * Best-effort parsing of JSON that may include extra noise around it.
 * - Strips ANSI codes
 * - Trims whitespace
 * - Extracts the JSON envelope between the first opening and last closing bracket/brace
 */
export class IncompleteJsonError extends Error {
  constructor(message = "Incomplete JSON output") {
    super(message);
    this.name = "IncompleteJsonError";
  }
}

function endsWithJsonTerminator(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  const last = t[t.length - 1];
  return last === "]" || last === "}";
}

export function safeJsonParse<T = unknown>(raw: string): T {
  const cleaned = stripAnsi(raw).trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const extracted = extractJsonEnvelope(cleaned).trim();
    if (!endsWithJsonTerminator(extracted)) {
      // Likely incomplete output (yabai still writing)
      throw new IncompleteJsonError();
    }
    return JSON.parse(extracted) as T;
  }
}
