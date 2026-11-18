// inlined copy of searchSpotlight (from src/common/search-spotlight.tsx) to test
// the wrapper logic without @raycast/api dependency
// usage: bun run scripts/test-search-wrapper.ts [query]

import spotlight from "../src/libs/node-spotlight";

interface SpotlightSearchResult {
  path: string;
  kMDItemDisplayName?: string;
  kMDItemFSName?: string;
}

const folderSpotlightSearchAttributes = [
  "kMDItemDisplayName",
  "kMDItemFSCreationDate",
  "kMDItemFSName",
  "kMDItemFSSize",
  "kMDItemPath",
  "kMDItemContentModificationDate",
  "kMDItemKind",
  "kMDItemContentType",
  "kMDItemLastUsedDate",
  "kMDItemUseCount",
];

function normalizePath(inputPath: string): string {
  return inputPath.replace(/\/+$/, "").toLowerCase();
}

const searchSpotlight = (
  search: string,
  searchScope: string,
  abortable: { current: AbortController | null | undefined } | undefined,
): Promise<SpotlightSearchResult[]> => {
  const maxResults = 250;
  const isExactSearch = search.startsWith("[") && search.endsWith("]");

  const searchFilter = isExactSearch
    ? ["kMDItemContentType=='public.folder'", `kMDItemDisplayName == '${search.replace(/[[|\]]/gi, "")}'`]
    : [
        "kMDItemContentType=='public.folder'",
        `(kMDItemDisplayName = "*${search}*"cd || kMDItemPath = "*${search}*"cd)`,
      ];

  return new Promise((resolve, reject) => {
    const addedPaths = new Set<string>();
    const allResults: SpotlightSearchResult[] = [];
    let resultsCount = 0;
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    console.log(`[wrapper] spawning spotlight, filter:`, searchFilter);
    const stream = spotlight(
      search,
      searchScope || null,
      searchFilter,
      folderSpotlightSearchAttributes as never,
      abortable,
    );

    stream
      .on("data", (result: SpotlightSearchResult) => {
        const normalizedPath = normalizePath(result.path);
        if (addedPaths.has(normalizedPath)) {
          console.log(`[wrapper] duplicate skipped: ${result.path}`);
          return;
        }
        addedPaths.add(normalizedPath);

        if (resultsCount < maxResults) {
          resultsCount++;
          allResults.push(result);
        } else {
          console.log(`[wrapper] hit maxResults, aborting`);
          abortable?.current?.abort();
          settle(() => resolve(allResults));
        }
      })
      .on("error", (e: Error) => {
        console.log(`[wrapper] stream error:`, e.name, e.message);
        if (e.name === "AbortError" || e.message.includes("aborted")) {
          settle(() => resolve(allResults));
          return;
        }
        settle(() => reject(e));
      })
      .on("end", () => {
        console.log(`[wrapper] stream end, ${allResults.length} results`);
        settle(() => resolve(allResults));
      });
  });
};

// === test runner ===
(async () => {
  const query = process.argv[2] || "downloads";
  console.log(`[test] query: "${query}"`);
  const abortable = { current: new AbortController() };
  const startTime = Date.now();

  const timeoutId = setTimeout(() => {
    console.error(`[test] TIMEOUT after 10s`);
    abortable.current.abort();
    process.exit(1);
  }, 10000);

  try {
    const finalResults = await searchSpotlight(query, "", abortable);
    clearTimeout(timeoutId);
    console.log(`[test] ✓ resolved at +${Date.now() - startTime}ms, ${finalResults.length} results`);
    finalResults.slice(0, 5).forEach((r) => console.log(`  - ${r.path}`));
    process.exit(0);
  } catch (err) {
    clearTimeout(timeoutId);
    console.error(`[test] ✗ rejected:`, err);
    process.exit(2);
  }
})();
