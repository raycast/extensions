/** The string is also the placeholder prefix: PERSON gives [PERSON_1]. */
export const ENTITY_TYPES = [
  "PERSON",
  "LOCATION",
  "ORGANIZATION",
  "EMAIL",
  "PHONE",
  "IP",
  "IBAN",
  "CARD",
  "SIREN",
  "SIRET",
  "VAT",
  "API_KEY",
  "JWT",
  "PRIVATE_KEY",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

/** Deterministic wins every overlap with semantic. */
export type Layer = "deterministic" | "semantic";

/** Half-open UTF-16 offsets, usable as-is with String.slice. */
export interface Span {
  readonly type: EntityType;
  readonly start: number;
  readonly end: number;
  readonly layer: Layer;
  /** Value to number the placeholder by, when it differs from the matched text:
   * a lone first name shares the token of the full name it came from. */
  readonly alias?: string;
}

export type SemanticSkipReason =
  "unreachable" | "timeout" | "too-large" | "disabled" | "failed";

export function spansOverlap(a: Span, b: Span): boolean {
  return a.start < b.end && b.start < a.end;
}
