// Title autocomplete. GET /w/rest.php/v1/search/title, shaped for the list.

import { TitleSuggestion, searchTitles } from "./client";

export type { TitleSuggestion };

/** Wiktionary's own pages, not dictionary entries. */
const NAMESPACED =
  /^(Wiktionary|Appendix|Category|Template|Module|Thesaurus|Help|Index|Citations|Reconstruction|Talk|User):/;

export async function suggest(query: string, limit = 15): Promise<TitleSuggestion[]> {
  const term = query.trim();
  if (!term) return [];

  const results = (await searchTitles(term, limit)).filter(
    // `water/translations` is a Wiktionary subpage holding an entry's overflow,
    // not a word. It ranked third for "water" and has no etymology to show.
    (r) => !NAMESPACED.test(r.title) && !r.title.includes("/"),
  );

  // An exact match ranks below prefix matches often enough to be worth fixing:
  // someone typing a whole word wants that word.
  const exact = results.findIndex((r) => r.title.toLowerCase() === term.toLowerCase());
  if (exact > 0) results.unshift(...results.splice(exact, 1));

  return results;
}
