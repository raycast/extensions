/**
 * Telling a question from a query.
 *
 * The two engines behind `/search/` don't read the same language. The keyword index parses
 * CourtListener's operators — `caseName:Obergefell`, `citation:("410 U.S. 113")`, boolean AND,
 * groupings, wildcards. The semantic engine embeds whatever it is given as prose, so those
 * operators reach it as words: `caseName:Obergefell` returns six cases by keyword and 598 by
 * meaning, led by one with no connection to it, and `citation:("410 U.S. 113")` returns Roe v.
 * Wade by keyword and a topical sweep of abortion cases by meaning.
 *
 * Neither fails loudly — a wrong answer of the right shape comes back either way — so the choice
 * of engine can't be left to someone who has just typed an operator.
 */

/**
 * Anything CourtListener's keyword parser treats as syntax rather than as words.
 *
 * A field prefix has to be a bare word against a colon, so a time or a URL in the query doesn't
 * count. Booleans are only booleans in capitals, which is CourtListener's rule, and it keeps
 * "damages or restitution" a question. Quotes are deliberately absent: a quoted phrase means much
 * the same to both engines, and asking for one is not a reason to refuse the semantic search.
 */
const QUERY_SYNTAX = [
  /(?:^|\s)[a-zA-Z_]+:/, // caseName:foo, court_id:scotus
  /(?:^|\s)(?:AND|OR|NOT)(?:\s|$)/, // boolean operators, capitals only
  /[()[\]{}]/, // grouping and range syntax
  /\w\*/, // prefix or mid-word wildcard: qualif*
  // Only inside a word. A question mark at the end of "when is a search incident to arrest
  // lawful?" is punctuation, and questions are the one thing semantic search is best at.
  /\w\?\w/,
  /\S~\d*/, // fuzzy and proximity
  /(?:^|\s)[-+]\S/, // required and excluded terms
];

/**
 * Whether this text is written for the keyword parser. True means searching it by meaning would
 * quietly answer a different question, so that option shouldn't be offered.
 */
export function usesQuerySyntax(input: string): boolean {
  return QUERY_SYNTAX.some((pattern) => pattern.test(input));
}
