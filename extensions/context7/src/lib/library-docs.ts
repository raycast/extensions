import { logger } from "@chrismessina/raycast-logger";

import { browseLibraryDocs } from "./context7";
import { readCachedLibrary, writeCachedLibrary } from "./library-cache";
import type { ContextSnippet, SavedLibrary } from "./types";

export interface LibraryDocs {
  snippets: ContextSnippet[];
  /** Absent when the docs came straight off the network without being stored. */
  cachedAt?: string;
}

/**
 * Saved libraries are cached and answer instantly on later opens; unsaved ones are fetched
 * every time and never written to disk. That is the whole difference "Add to My Libraries"
 * makes — the network cost is identical the first time either way.
 */
export async function loadLibraryDocs(
  libraryId: string,
  options: { isSaved: boolean; forceRefresh?: boolean; signal?: AbortSignal },
): Promise<LibraryDocs> {
  const { isSaved, forceRefresh = false, signal } = options;

  if (isSaved && !forceRefresh) {
    const cached = await readCachedLibrary(libraryId);

    if (cached) {
      logger.log("loadLibraryDocs", {
        libraryId,
        source: "cache",
        snippets: cached.snippets.length,
        cachedAt: cached.cachedAt,
      });

      return { snippets: cached.snippets, cachedAt: cached.cachedAt };
    }
  }

  const snippets = await browseLibraryDocs(libraryId, signal);

  if (!isSaved) {
    // Not in My Libraries, so nothing is written to disk and the next open refetches.
    logger.log("loadLibraryDocs", { libraryId, source: "network", snippets: snippets.length, cached: false });
    return { snippets };
  }

  logger.log("loadLibraryDocs", {
    libraryId,
    source: forceRefresh ? "network (refresh)" : "network (cache miss)",
    snippets: snippets.length,
    cached: true,
  });

  const cached = await writeCachedLibrary(libraryId, snippets);

  return { snippets, cachedAt: cached.cachedAt };
}

/**
 * Every cached snippet across My Libraries, tagged with its origin.
 *
 * Deliberately CACHE-ONLY. The semantic endpoint takes exactly one `libraryId`, so searching
 * all libraries that way would cost one request per library per debounced keystroke — five
 * libraries would burn a 1,000-request month in ~200 searches. Local filtering over what is
 * already on disk is free, instant, and works offline; narrowing to one library in the
 * dropdown is what re-enables the semantic search.
 */
export async function loadAllCachedDocs(libraries: SavedLibrary[]) {
  const perLibrary = await Promise.all(
    libraries.map(async (library) => {
      const cached = await readCachedLibrary(library.id);

      return {
        // A cached-but-empty library is cached. Inferring that from a zero length would tell
        // the user to refresh something that is already up to date.
        isCached: cached !== undefined,
        snippets: (cached?.snippets ?? []).map((snippet) => ({
          ...snippet,
          libraryId: library.id,
          libraryName: library.name,
        })),
      };
    }),
  );

  const snippets = perLibrary.flatMap((entry) => entry.snippets);
  const uncached = libraries.filter((_, index) => !perLibrary[index].isCached);

  logger.log("loadAllCachedDocs", {
    libraries: libraries.length,
    snippets: snippets.length,
    uncached: uncached.length,
  });

  return { snippets, uncached };
}

/**
 * Rendering every match is pointless past the first screenful and costs real time once the
 * corpus spans many libraries — nobody scrolls to result 400.
 */
export const MAX_LOCAL_MATCHES = 200;

/**
 * Lowercasing every snippet's content on every keystroke is the expensive part, and the
 * content does not change between keystrokes. Prepare the haystack once per load instead.
 */
export function prepareSearchIndex<T extends { title: string; content: string; libraryName?: string }>(snippets: T[]) {
  return snippets.map((snippet) => ({
    snippet,
    haystack: `${snippet.title}\n${snippet.libraryName ?? ""}\n${snippet.content}`.toLowerCase(),
  }));
}

export function searchIndex<T>(index: Array<{ snippet: T; haystack: string }>, query: string) {
  const needle = query.trim().toLowerCase();
  const matches: T[] = [];

  for (const entry of index) {
    if (matches.length >= MAX_LOCAL_MATCHES) {
      break;
    }

    if (!needle || entry.haystack.includes(needle)) {
      matches.push(entry.snippet);
    }
  }

  return matches;
}

/**
 * Persists docs already held in memory. Adding a library from the documentation view has
 * just finished fetching it, so refetching to populate the cache would spend a second
 * request for bytes we are already holding.
 */
export async function cacheLoadedDocs(libraryId: string, snippets: ContextSnippet[]) {
  const cached = await writeCachedLibrary(libraryId, snippets);

  return cached.cachedAt;
}
