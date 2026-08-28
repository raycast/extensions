/**
 * Query clauses suggested for each OpenSearch field type. Used by the Search
 * command to help build a query DSL from a field's mapping.
 */
export const QUERY_SUGGESTIONS: Record<string, string[]> = {
  text: ["match", "match_phrase", "prefix"],
  keyword: ["term", "terms"],
  integer: ["range", "term"],
  long: ["range", "term"],
  short: ["range", "term"],
  byte: ["range", "term"],
  double: ["range"],
  float: ["range"],
  half_float: ["range"],
  scaled_float: ["range"],
  date: ["range", "term"],
  boolean: ["term", "exists"],
  ip: ["term", "range"],
};

export function suggestForType(type: string): string[] {
  return QUERY_SUGGESTIONS[type] ?? ["match", "term", "exists"];
}

/** A minimal query DSL snippet for a `field` + `clause` pair, ready to be edited. */
export function sampleClause(field: string, clause: string): Record<string, unknown> {
  switch (clause) {
    case "range":
      return { range: { [field]: { gte: null, lte: null } } };
    case "exists":
      return { exists: { field } };
    case "terms":
      return { terms: { [field]: [] } };
    case "match":
    case "match_phrase":
    case "prefix":
    case "term":
    default:
      return { [clause]: { [field]: "" } };
  }
}
