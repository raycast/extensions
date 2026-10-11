import assert from "node:assert/strict";
import { processResults } from "../src/lib/result-processing";
import type { AcademicSettings } from "../src/lib/settings";
import type { WorkResult } from "../src/types";

const book: WorkResult = {
  id: "book", title: "Test Book", authors: ["Ada Researcher"], kind: "book", languages: ["eng"],
  identifiers: { isbn: ["9780000000002"] }, sources: ["Test"],
  accessLinks: [
    { label: "PDF", url: "https://example.org/book.pdf", source: "Test", kind: "download", format: "PDF" },
    { label: "EPUB", url: "https://example.org/book.epub", source: "Test", kind: "download", format: "EPUB" },
    { label: "Record", url: "https://example.org/book", source: "Test", kind: "record" },
  ], confidence: "exact",
};
const settings: AcademicSettings = { sources: [], metadataSources: [], encyclopediaSources: [], languages: ["en"], countries: ["br"], marketplaces: ["br:amazon"], formats: ["pdf"], includeUnknownLanguage: false, showWorksWithoutAcceptedFiles: true, hideLowConfidenceResults: true, showUnavailableSources: false, defaultCitationStyle: "abnt" };

const processed = processResults([book], { text: "Test Book" }, settings, true);
assert.equal(processed.results.length, 1);
assert(processed.results[0].accessLinks.some((link) => link.url.endsWith(".pdf")));
assert(!processed.results[0].accessLinks.some((link) => link.url.endsWith(".epub")));
assert(processed.results[0].accessLinks.some((link) => link.kind === "purchase"));

const fallback = processResults([{ ...book, languages: ["fr"] }], { text: "Test Book" }, { ...settings, languages: ["pt"], countries: [] }, true);
assert.equal(fallback.results.length, 1);
assert.match(fallback.notice ?? "", /No results/);

console.log("PASS processing regression: language fallback, accepted formats and marketplaces");
