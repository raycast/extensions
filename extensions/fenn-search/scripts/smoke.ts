// Opt-in integration check against the user's running, licensed Fenn backend.
// Only counts/timing are logged; no tokens, filenames, or indexed text.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { searchFenn } from "../src/fenn-client";
import { resultMatches, SEARCH_MODES } from "../src/search-model";

async function main() {
  const query = process.argv[2];
  if (!query) throw new Error("Usage: npm run smoke -- <query>");
  const clientId = `raycast-smoke-${randomUUID()}`;
  let requestId = 0;
  for (const mode of SEARCH_MODES) {
    const started = Date.now();
    const sections = await searchFenn(
      {
        query,
        mode: mode.value,
        fileTypes: ["pdf", "audio"],
        clientId,
        requestId: ++requestId,
      },
      undefined,
      new AbortController().signal,
    );
    const rows = sections.flatMap((section) => section.results);
    for (const result of rows) {
      assert.match(result.original_file.toLowerCase(), /\.(pdf|mp3|wav|flac|aac|aiff|ogg|m4a)$/);
    }
    console.log(
      JSON.stringify({
        mode: mode.value,
        files: rows.length,
        locations: rows.reduce((sum, row) => sum + resultMatches(row).length, 0),
        elapsedMs: Date.now() - started,
      }),
    );
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
