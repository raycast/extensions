/**
 * Parses additional ignore patterns from a comma-separated string.
 * Filters out empty patterns and trims whitespace.
 *
 * @param patterns - Comma-separated string of ignore patterns, or undefined.
 * @returns Array of parsed patterns, or undefined if input is undefined/empty.
 */
export function parseIgnorePatterns(patterns: string | undefined): string[] | undefined {
  if (!patterns) {
    return undefined;
  }

  const parsed = patterns
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return parsed.length > 0 ? parsed : undefined;
}
