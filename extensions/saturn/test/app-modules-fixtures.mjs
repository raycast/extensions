/**
 * Integration fixtures for the app's search modules (sidecar store + inverted
 * index + store events), bundled straight from the app's sources with a
 * @glaze/core/backend stub. Runs with HOME pointed at a temp dir, so the real
 * ~/Saturn is never touched.
 *
 * Run: node test/app-modules-fixtures.mjs
 */

import { existsSync, mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildSync } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_SRC = path.join(
  os.homedir(),
  "Library/Application Support/app.glaze.macos.main/apps/shelf-local-1v0xag7h/.glaze-sources",
);

// Point HOME at a temp dir BEFORE importing the bundle — paths.ts resolves
// SATURN_ROOT from os.homedir() at module evaluation time.
const testHome = mkdtempSync(path.join(os.tmpdir(), "saturn-app-test-"));
process.env.HOME = testHome;

const outFile = path.join(mkdtempSync(path.join(os.tmpdir(), "saturn-app-mod-")), "app-modules.mjs");
buildSync({
  stdin: {
    contents: `
      export * from "./main/saturn/search-index.js";
      export * from "./main/saturn/page-texts.js";
      export { saturnStore } from "./main/saturn/store.js";
    `,
    resolveDir: APP_SRC,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  alias: { "@glaze/core/backend": path.join(__dirname, "stubs/glaze-core-backend.mjs") },
  outfile: outFile,
  logLevel: "silent",
});

const mod = await import(pathToFileURL(outFile).href);
const {
  saturnStore,
  loadPageTexts,
  initSearchIndex,
  snapshot,
  setPageText,
  getPageText,
  removePageText,
  allPageTexts,
} = mod;

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log(`  ok ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name}`);
  }
}
const postingsFor = (snap, term, id) => (snap.terms[term] ?? []).filter((p) => p.id === id);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

saturnStore.load();
loadPageTexts();
initSearchIndex();

console.log("index on add");
const item = saturnStore.addItem({
  type: "link",
  payload: "https://example.com/x",
  title: "Compositing deep dive",
  tags: ["rendering"],
});
{
  const snap = snapshot();
  check(
    "title term indexed with title field",
    postingsFor(snap, "compositing", item.id).some((p) => p.f === 1),
  );
  check(
    "tag term indexed with tag field",
    postingsFor(snap, "rendering", item.id).some((p) => p.f === 2),
  );
  check("no body postings yet", !postingsFor(snap, "pipelines", item.id).length);
  check("doc stats recorded", snap.docs[item.id]?.title > 0 && snap.docs[item.id]?.tags > 0);
}

console.log("sidecar text → body indexed");
{
  setPageText(item.id, "body text about compositing pipelines");
  const snap = snapshot();
  check(
    "body term indexed with body field",
    postingsFor(snap, "pipelines", item.id).some((p) => p.f === 4),
  );
  check(
    "same term can carry title+body postings",
    postingsFor(snap, "compositing", item.id).some((p) => p.f === 1) &&
      postingsFor(snap, "compositing", item.id).some((p) => p.f === 4),
  );
  check("doc body count updated", snap.docs[item.id]?.body > 0);
}

console.log("sidecar cap");
{
  // Throwaway id (no matching store item) — must not affect the main item's index.
  setPageText("cap-test-id", "word ".repeat(30000)); // 150k chars
  check("sidecar text capped at 20k chars", getPageText("cap-test-id")?.length === 20000);
  const snap = snapshot();
  check("unowned sidecar text is not indexed", (snap.terms["word"] ?? []).length === 0);
  removePageText("cap-test-id");
}

console.log("meta update reindexes");
{
  saturnStore.updateItemMeta(item.id, { title: "Renamed title" });
  const snap = snapshot();
  check("old title term gone", !postingsFor(snap, "compositing", item.id).some((p) => p.f === 1));
  check("new title term indexed", postingsFor(snap, "renamed", item.id).some((p) => p.f === 1));
  check("body postings survive title edit", postingsFor(snap, "pipelines", item.id).some((p) => p.f === 4));
}

console.log("persistence (debounced)");
{
  await delay(600);
  check(
    "page-texts.json written under (temp) ~/Saturn",
    existsSync(path.join(testHome, "Saturn", "page-texts.json")),
  );
  check(
    "search-index.json written under (temp) ~/Saturn",
    existsSync(path.join(testHome, "Saturn", "search-index.json")),
  );
}

console.log("delete drops postings + sidecar");
{
  saturnStore.deleteItem(item.id);
  const snap = snapshot();
  check("body postings removed", !postingsFor(snap, "pipelines", item.id).length);
  check("title postings removed", !postingsFor(snap, "renamed", item.id).length);
  check("sidecar entry removed", getPageText(item.id) === undefined);
  check("sidecar map empty", Object.keys(allPageTexts()).length === 0);
}

console.log("restore reindexes title/tags (body awaits re-extract)");
{
  saturnStore.restoreItem(item);
  const snap = snapshot();
  check("title postings back", postingsFor(snap, "renamed", item.id).some((p) => p.f === 1));
  check("body still empty until re-extraction", !postingsFor(snap, "pipelines", item.id).length);
}

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nPASS app modules fixtures");
