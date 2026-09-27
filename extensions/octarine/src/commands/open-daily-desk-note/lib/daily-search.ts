import { matchesDateQuery, resolveDateQuery, type DateQuery } from "@lib/daily-desk";
import { createSearchMatcher } from "@lib/search";
import type { IndexedNote, WorkspaceSection } from "@type/notes";

/**
 * Builds the resolved query and matcher used by the Daily Desk search.
 *
 * @param searchText Raw search query typed by the user.
 *
 * @remarks
 * A note matches when its date matches the query or its searchable text matches the query.
 */
export function createDailySearch(searchText: string): {
  query: DateQuery | null;
  matches: (note: IndexedNote) => boolean;
} {
  const query = resolveDateQuery(searchText);
  const matchesText = createSearchMatcher(searchText);

  return {
    query,
    matches: (note) => {
      return Boolean(query && matchesDateQuery(query, note.path)) || matchesText(note);
    },
  };
}

/**
 * Moves exact date matches to the front of each workspace section.
 *
 * @param sections Sections returned by the daily notes hook.
 * @param query Resolved date expression typed by the user.
 *
 * @remarks
 * The function keeps workspace sections and moves exact date matches before related notes.
 */
export function prioritizeExactDateMatches(
  sections: WorkspaceSection[],
  query: DateQuery,
): { sections: WorkspaceSection[]; hasExactMatch: boolean } {
  let hasExactMatch = false;

  const prioritized = sections.map((section) => {
    const exact: IndexedNote[] = [];
    const related: IndexedNote[] = [];

    for (const note of section.notes) {
      if (matchesDateQuery(query, note.path)) {
        exact.push(note);
      } else {
        related.push(note);
      }
    }

    hasExactMatch ||= exact.length > 0;
    return exact.length === 0 || related.length === 0 ? section : { ...section, notes: [...exact, ...related] };
  });

  return { sections: prioritized, hasExactMatch };
}
