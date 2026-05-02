/**
 * @module predicate-textarea
 *
 * Helpers for formatting predicate strings into a multiline TextArea
 * representation and normalizing them back to canonical single-line form.
 *
 * Only top-level `&&` separators outside single-quoted strings are split.
 * Quoted strings containing `&&` remain intact.
 */

/**
 * Split a predicate string on top-level `&&` separators (outside
 * single-quoted strings) and return one trimmed condition per line.
 *
 * `"A && B"` → `"A\nB"`
 * `"A && 'foo && bar'"` → `"A\n'foo && bar'"`
 */
export function formatPredicateForTextArea(predicate: string): string {
  const conditions = splitTopLevelAnd(predicate);
  return conditions.map((c) => c.trim()).join("\n");
}

/**
 * Normalize a multiline textarea value back to a canonical single-line
 * predicate joined with ` && `.
 *
 * - Blank lines are ignored.
 * - Each line is trimmed.
 * - A single-line paste like `"A && B"` is handled (split on `&&`, rejoin).
 *
 * `"A\nB"` → `"A && B"`
 * `"  A  \n\n  B  "` → `"A && B"`
 */
export function normalizePredicateFromTextArea(text: string): string {
  const lines = text.split("\n").map((l) => l.trim());

  const expanded: string[] = [];
  for (const line of lines) {
    if (!line) continue;
    const parts = splitTopLevelAnd(line);
    expanded.push(...parts.map((p) => p.trim()));
  }

  const filtered = expanded.filter((l) => l.length > 0);
  return filtered.join(" && ");
}

/**
 * Split a string on `&&` that are NOT inside single-quoted strings.
 * Mirrors the tokenizer logic from predicate-validator.ts.
 */
function splitTopLevelAnd(input: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "'") {
      inQuote = !inQuote;
      current += ch;
    } else if (!inQuote && input[i] === "&" && input[i + 1] === "&") {
      parts.push(current);
      current = "";
      i++;
    } else {
      current += ch;
    }
  }
  parts.push(current);

  return parts;
}
