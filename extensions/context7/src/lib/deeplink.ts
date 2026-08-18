import { createDeeplink } from "@raycast/utils";

import type { LibrarySummary } from "./types";

export function createSearchContextDeeplink(library: LibrarySummary) {
  return createDeeplink({
    command: "search-documentation",
    arguments: {
      libraryId: library.id,
    },
  });
}

export function createSearchLibrariesDeeplink() {
  return createDeeplink({ command: "search-libraries" });
}
