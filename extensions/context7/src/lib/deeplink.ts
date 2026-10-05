import { createDeeplink } from "@raycast/utils";

import type { LibrarySummary } from "./types";

/**
 * Quicklinks need a URL, so this one genuinely must be a deeplink — `launchCommand` cannot
 * produce something Raycast can store and re-open later.
 */
export function createSearchContextDeeplink(library: LibrarySummary) {
  return createDeeplink({
    command: "search-documentation",
    arguments: {
      libraryId: library.id,
    },
  });
}
