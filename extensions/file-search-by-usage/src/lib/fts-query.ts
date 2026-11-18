/**
 * Turning typed text into an FTS5 MATCH expression.
 *
 * Everything the user types is data. FTS5 has its own grammar (`AND`, `OR`,
 * `NOT`, `NEAR`, `:`, `^`, `*`, parentheses), and an unquoted term goes through
 * that grammar: a bare `---` is a syntax error, not an empty search. So every
 * term is wrapped in a double-quoted string literal with internal quotes
 * doubled, and the prefix `*` is attached outside the quotes where FTS5 reads it
 * as an operator rather than as text.
 *
 * Verified against SQLite 3.51.2 with `tokenize='unicode61 remove_diacritics 2'`:
 *
 *   "annual"* AND "ledger"*   matches "Annual Ledger Summary.pdf"
 *   "AND"*                    matches a file named "x AND y.txt"
 *   "a""quote"*               matches a file named 'a"quote.txt'
 *   ""*  and  "---"*          return no rows, and raise no error
 *   ---                       raises: fts5: syntax error near "-"
 */

/**
 * unicode61 treats every non-alphanumeric character as a separator, so a term
 * made only of punctuation produces no tokens and can only ever match nothing.
 * Such a term is dropped instead of being ANDed in, which would empty an
 * otherwise good result set.
 */
const HAS_TOKEN_CHARACTER = /[\p{L}\p{N}]/u;

/** Shortest term the index is asked about. Shorter text stays in memory. */
export const MIN_INDEX_TERM = 3;

/** Wrap one term as an FTS5 prefix phrase. */
function prefixPhrase(term: string): string {
  return `"${term.replace(/"/gu, '""')}"*`;
}

export type FtsQuery = {
  /** The MATCH expression, or undefined when no term is usable. */
  match?: string;
  /** True when every usable term was shorter than MIN_INDEX_TERM. */
  tooShort: boolean;
};

/**
 * Build the MATCH expression for a set of typed terms.
 *
 * Multiple words are ANDed as independent prefixes, so `annual ledger` finds a
 * name containing both regardless of their order within the name. A term that
 * itself contains separators stays one phrase, so `report-2026` requires those
 * tokens adjacent, which is what someone typing a hyphenated name means.
 */
export function buildFtsQuery(
  terms: readonly string[],
  minLength = MIN_INDEX_TERM,
): FtsQuery {
  const usable = terms.filter((term) => HAS_TOKEN_CHARACTER.test(term));
  if (usable.length === 0) return { tooShort: false };

  // Length is measured on the typed term. A short term cannot be made selective
  // by quoting it, and a two-character prefix over a whole drive is not useful.
  const longEnough = usable.filter((term) => term.length >= minLength);
  if (longEnough.length === 0) return { tooShort: true };

  return {
    match: longEnough.map(prefixPhrase).join(" AND "),
    tooShort: false,
  };
}
