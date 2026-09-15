import assert from "node:assert/strict";
import { mergeAccessIntoSelected, targetedQueries, targetedQuery, targetedRequest } from "../src/lib/staged-results";
import { searchProviderWithFallback } from "../src/lib/provider-search";
import type { SearchProvider, WorkResult } from "../src/types";

const metadata: WorkResult = {
  id: "metadata:kripke",
  title: "Semantical Analysis of Modal Logic I",
  authors: ["Saul A. Kripke"],
  year: 1963,
  publisher: "Trusted Bibliography",
  kind: "article",
  identifiers: { doi: "10.1002/malq.19630090502" },
  sources: ["Metadata"],
  metadataSources: ["Metadata"],
  accessLinks: [],
};

const richlyIdentified = {
  ...metadata,
  identifiers: { doi: metadata.identifiers.doi, isbn: ["9780123456789"], issn: ["0025-5831"], pmid: "12345" },
};
const access: WorkResult = {
  ...metadata,
  id: "access:kripke",
  publisher: "Access-only Metadata",
  sources: ["Repository"],
  metadataSources: [],
  accessSources: ["Repository"],
  metadataEligible: false,
  accessLinks: [{ label: "Repository Record", url: "https://example.org/kripke", source: "Repository", kind: "record" }],
};
const unrelated: WorkResult = { ...access, id: "unrelated", title: "Modal Logic before Kripke", authors: ["Other Author"], identifiers: {}, accessLinks: [{ label: "Wrong", url: "https://example.org/wrong", source: "Wrong", kind: "record" }] };

const result = mergeAccessIntoSelected(metadata, [access, unrelated]);
assert.equal(targetedQuery(metadata), "10.1002/malq.19630090502");
assert.deepEqual(targetedRequest(metadata), {
  text: "10.1002/malq.19630090502",
  matchText: "Semantical Analysis of Modal Logic I Saul A. Kripke",
  fallbackTexts: ["Semantical Analysis of Modal Logic I Saul A. Kripke", "Semantical Analysis of Modal Logic I"],
});
assert.deepEqual(targetedQueries(richlyIdentified), [
  "10.1002/malq.19630090502",
  "Semantical Analysis of Modal Logic I Saul A. Kripke",
  "9780123456789",
  "0025-5831",
  "12345",
  "Semantical Analysis of Modal Logic I",
]);
assert.equal(result.publisher, "Trusted Bibliography");
assert.deepEqual(result.accessLinks.map((link) => link.url), ["https://example.org/kripke"]);
assert(!result.sources.includes("__academic_selected_work__"));
console.log("PASS staged search regression: preliminary access merges only into the selected bibliographic work");

const calls: string[] = [];
const fallbackProvider: SearchProvider = {
  id: "fallback-test",
  name: "Fallback Test",
  async search(query) {
    calls.push(query);
    return query.startsWith("10.") ? [] : [access];
  },
};
async function testFallback(): Promise<void> {
  const fallbackResults = await searchProviderWithFallback(fallbackProvider, metadata.identifiers.doi!, {
    signal: AbortSignal.timeout(1_000),
    fallbackQueries: ["Semantical Analysis of Modal Logic I Saul A. Kripke"],
  });
  assert.deepEqual(calls, ["10.1002/malq.19630090502", "Semantical Analysis of Modal Logic I Saul A. Kripke"]);
  assert.equal(fallbackResults.length, 1);
  console.log("PASS staged source lookup: DOI is preferred and title plus author is used only as fallback");
}

void testFallback();
