import { type Span, spansOverlap } from "./types";

/** Short leading words are initials or particles ("El", "Le"), not first names. */
const MIN_FIRST_NAME = 3;

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** GLiNER scores a lone first name near 0.3, under any usable floor, but the
 * same person's full name elsewhere in the text makes that occurrence certain. */
export function propagateFirstNames(
  text: string,
  accepted: readonly Span[],
): Span[] {
  const found: Span[] = [];
  const claimed = [...accepted];

  for (const span of accepted) {
    if (span.type !== "PERSON") continue;

    const value = text.slice(span.start, span.end);
    const [first] = value.split(/\s+/);
    if (first === undefined || first.length < MIN_FIRST_NAME || first === value)
      continue;

    // Case-sensitive and word-bounded, so the name inside a longer word stays put.
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])${escape(first)}(?![\\p{L}\\p{N}])`,
      "gu",
    );

    for (const match of text.matchAll(pattern)) {
      if (match.index === undefined) continue;
      const candidate: Span = {
        type: "PERSON",
        start: match.index,
        end: match.index + first.length,
        layer: "deterministic",
        alias: value,
      };
      if (claimed.some((kept) => spansOverlap(candidate, kept))) continue;
      claimed.push(candidate);
      found.push(candidate);
    }
  }

  return found;
}
