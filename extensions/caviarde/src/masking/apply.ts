import type { EntityType, Span } from "../detection/types";
import { createPlaceholderAssigner } from "./placeholders";

export interface MaskingResult {
  readonly masked: string;
  /** Distinct values masked per type, not occurrences: two mentions of one name
   * share a placeholder and count once. */
  readonly counts: ReadonlyMap<EntityType, number>;
}

export function applyMasking(
  text: string,
  spans: readonly Span[],
): MaskingResult {
  const assign = createPlaceholderAssigner();
  const counts = new Map<EntityType, number>();
  const seen = new Set<string>();

  const ordered = [...spans].sort((a, b) => a.start - b.start);
  for (const span of ordered) {
    const placeholder = assign(
      span.type,
      span.alias ?? text.slice(span.start, span.end),
    );
    if (seen.has(placeholder)) continue;
    seen.add(placeholder);
    counts.set(span.type, (counts.get(span.type) ?? 0) + 1);
  }

  // Right to left, so an earlier replacement never shifts a later offset.
  let masked = text;
  for (let i = ordered.length - 1; i >= 0; i--) {
    const span = ordered[i];
    if (span === undefined) continue;
    const placeholder = assign(
      span.type,
      span.alias ?? text.slice(span.start, span.end),
    );
    masked = masked.slice(0, span.start) + placeholder + masked.slice(span.end);
  }

  return { masked, counts };
}
