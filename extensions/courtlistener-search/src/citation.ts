/**
 * Recognising a citation in the search bar, so "410 U.S. 113" can be looked up as a citation
 * rather than thrown at the full-text index — which ranks it terribly (46,989 hits, none of them
 * Roe v. Wade). CourtListener's `citation:("…")` field query returns the single matching case, but
 * only when it gets the citation on its own: a trailing "(1973)" or a leading case name breaks it.
 */

/** Shorthand people type without periods, mapped to the form CourtListener indexes. */
const REPORTERS: Record<string, string> = {
  us: "U.S.",
  sct: "S. Ct.",
  led: "L. Ed.",
  led2d: "L. Ed. 2d",
  f: "F.",
  f2d: "F.2d",
  f3d: "F.3d",
  f4th: "F.4th",
  fsupp: "F. Supp.",
  fsupp2d: "F. Supp. 2d",
  fsupp3d: "F. Supp. 3d",
};

/** Statutes and regulations look like citations but aren't cases. */
const NOT_REPORTERS = new Set(["usc", "usca", "cfr", "stat"]);

/** A reporter word ("U.S.", "Supp.", "F.4th") or a bare series ordinal ("2d", "4th"). */
const TOKEN = String.raw`(?:[A-Za-z][A-Za-z.0-9]{0,7}|\d(?:d|st|nd|rd|th))`;
const CITATION = new RegExp(String.raw`\b(\d{1,4})\s+(${TOKEN}(?:\s+${TOKEN}){0,3})\s+(\d{1,5})\b`);

/**
 * Pull a reporter citation out of whatever was typed, normalised for the citation query, or return
 * null when the text is an ordinary search. Matches anywhere in the string, so pasting
 * "Roe v. Wade, 410 U.S. 113 (1973)" finds the case.
 */
export function detectCitation(input: string): string | null {
  const match = CITATION.exec(input);
  if (!match) {
    return null;
  }

  const [, volume, rawReporter, page] = match;
  const key = rawReporter.toLowerCase().replace(/[.\s]/g, "");
  if (NOT_REPORTERS.has(key)) {
    return null;
  }

  // A period is what separates a reporter from two numbers that happen to sit either side of a
  // word — "5 justices 4" shouldn't look like a citation.
  const reporter = REPORTERS[key] ?? (rawReporter.includes(".") ? rawReporter.replace(/\s+/g, " ").trim() : null);
  if (!reporter) {
    return null;
  }

  return `${volume} ${reporter} ${page}`;
}
