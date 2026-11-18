// standalone test harness - calls node-spotlight (mdfind wrapper) directly
// bypasses @raycast/api to test the actual search path used by the extension
// usage: bun run scripts/test-search.ts [query]

import spotlight from "../src/libs/node-spotlight";

interface SpotlightResult {
  path: string;
  kMDItemDisplayName?: string;
  kMDItemFSName?: string;
}

const query = process.argv[2] || "downloads";
const maxResults = 250;

console.log(`[test] query: "${query}"`);
console.log(`[test] starting spotlight stream...`);

const abortable = { current: new AbortController() };
const startTime = Date.now();
const results: SpotlightResult[] = [];
let dataEvents = 0;

// exact same filter our extension uses
const searchFilter = [
  "kMDItemContentType=='public.folder'",
  `(kMDItemDisplayName = "*${query}*"cd || kMDItemPath = "*${query}*"cd)`,
];

const attrs = [
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

const stream = spotlight(query, null, searchFilter, attrs as never, abortable);

// 10s timeout
const timeoutId = setTimeout(() => {
  console.error(`[test] TIMEOUT after 10s`);
  abortable.current.abort();
  console.log(`[test] received ${dataEvents} data events, ${results.length} results before timeout`);
  process.exit(1);
}, 10000);

stream
  .on("data", (result: SpotlightResult) => {
    dataEvents++;
    if (results.length < maxResults) {
      results.push(result);
    } else if (results.length === maxResults) {
      console.log(`[test] hit maxResults=${maxResults}, aborting stream`);
      abortable.current.abort();
    }
    if (dataEvents <= 5) {
      console.log(`[test] +${Date.now() - startTime}ms data #${dataEvents}: ${result.path}`);
    }
  })
  .on("end", () => {
    clearTimeout(timeoutId);
    console.log(`[test] stream END at +${Date.now() - startTime}ms`);
    console.log(`[test] total data events: ${dataEvents}`);
    console.log(`[test] collected results: ${results.length}`);
    if (results.length > 0) {
      console.log(`[test] sample results:`);
      results.slice(0, 5).forEach((r) => console.log(`  - ${r.path}`));
    }
    process.exit(0);
  })
  .on("error", (err: Error) => {
    clearTimeout(timeoutId);
    if (err.name === "AbortError" || err.message.includes("aborted")) {
      console.log(`[test] stream aborted cleanly at +${Date.now() - startTime}ms`);
      console.log(`[test] collected ${results.length} results before abort`);
      process.exit(0);
    }
    console.error(`[test] stream ERROR at +${Date.now() - startTime}ms:`, err);
    process.exit(2);
  });
