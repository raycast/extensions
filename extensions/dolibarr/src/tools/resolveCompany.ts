import type { Thirdparty } from "../api/types";
import { normalize, search } from "../index/fuzzy";
import { THIRDPARTY_FIELDS } from "../index/loadIndex";

export type CompanyResolution =
  { kind: "none" } | { kind: "one"; company: Thirdparty } | { kind: "many"; candidates: Thirdparty[] };

const SEARCH_LIMIT = 20;

/**
 * Never guesses between similarly named companies: naming the wrong customer would produce wrong
 * financial statements. The one exception is an exact name match, so that "Kranich AG" is not held
 * hostage by the existence of "Kranich Antriebe AG".
 */
export function resolveCompany(companies: Thirdparty[], query: string, maxCandidates = 5): CompanyResolution {
  const trimmed = query.trim();
  if (trimmed.length === 0) return { kind: "none" };

  const matches = search(companies, THIRDPARTY_FIELDS, trimmed, SEARCH_LIMIT);
  if (matches.length === 0) return { kind: "none" };

  const needle = normalize(trimmed);
  const exact = matches.filter(
    (candidate) =>
      normalize(candidate.name) === needle ||
      (candidate.nameAlias !== null && normalize(candidate.nameAlias) === needle),
  );
  if (exact.length === 1) return { kind: "one", company: exact[0] };

  if (matches.length === 1) return { kind: "one", company: matches[0] };
  return { kind: "many", candidates: matches.slice(0, maxCandidates) };
}
