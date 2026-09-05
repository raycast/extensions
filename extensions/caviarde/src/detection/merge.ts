import { type Span, spansOverlap } from "./types";

/** Longer first, then earlier, so resolution never depends on input order. */
function byLengthThenPosition(a: Span, b: Span): number {
  const lengthDiff = b.end - b.start - (a.end - a.start);
  return lengthDiff !== 0 ? lengthDiff : a.start - b.start;
}

/** A semantic span touching a deterministic one is dropped whole: trimming a
 * name out of an email would leave the domain live. */
export function mergeSpans(spans: readonly Span[]): Span[] {
  const deterministic = spans.filter((s) => s.layer === "deterministic");
  const semantic = spans.filter((s) => s.layer === "semantic");

  const accepted: Span[] = [];

  for (const span of [...deterministic].sort(byLengthThenPosition)) {
    if (!accepted.some((kept) => spansOverlap(span, kept))) accepted.push(span);
  }

  for (const span of [...semantic].sort(byLengthThenPosition)) {
    if (!accepted.some((kept) => spansOverlap(span, kept))) accepted.push(span);
  }

  return accepted.sort((a, b) => a.start - b.start || a.end - b.end);
}
