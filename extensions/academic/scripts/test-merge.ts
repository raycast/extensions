import assert from "node:assert/strict";
import { mergeAndRankResults } from "../src/lib/merge-results";
import type { WorkResult } from "../src/types";

const variants: WorkResult[] = [
  work({
    id: "open-library",
    title: "Array Programming with NumPy",
    authors: ["Charles R. Harris"],
    sources: ["Open Library"],
    accessLinks: [{ label: "Record", url: "https://example.org/open-library", source: "Open Library", kind: "record" }],
  }),
  work({
    id: "crossref",
    title: "Array programming with NumPy",
    authors: ["Harris, Charles R."],
    identifiers: { doi: "10.1038/s41586-020-2649-2" },
    sources: ["Crossref"],
    accessLinks: [{ label: "PDF", url: "https://example.org/paper.pdf", source: "Crossref", kind: "download" }],
  }),
  work({
    id: "semantic-scholar",
    title: "Array programming with NumPy.",
    authors: ["Charles R Harris"],
    identifiers: { doi: "https://doi.org/10.1038/s41586-020-2649-2" },
    sources: ["Semantic Scholar"],
    accessLinks: [{ label: "Record", url: "https://example.org/semantic", source: "Semantic Scholar", kind: "record" }],
  }),
];

const mergedArticle = mergeAndRankResults(variants, "Array programming with NumPy");
assert.equal(mergedArticle.length, 1, "source variants should merge into one work");
assert.deepEqual(new Set(mergedArticle[0].sources), new Set(["Open Library", "Crossref", "Semantic Scholar"]));
assert.equal(mergedArticle[0].accessLinks.length, 3);

const distinctAuthor = work({
  id: "different-work",
  title: "Array Programming with NumPy",
  authors: ["Different Author"],
  sources: ["Test"],
});
assert.equal(mergeAndRankResults([...variants, distinctAuthor], "Array programming").length, 2);

const bookEditions = [
  work({ id: "book-1", title: "Pride and Prejudice", authors: ["Jane Austen"], year: 1813, kind: "book", identifiers: { isbn: ["111"] } }),
  work({ id: "book-2", title: "Pride & Prejudice", authors: ["Austen, Jane"], year: 2003, kind: "book", identifiers: { isbn: ["222"] } }),
];
assert.equal(mergeAndRankResults(bookEditions, "Pride and Prejudice").length, 1, "book editions should consolidate by work");

const identityResults = [
  work({ id: "identity-book-a", title: "Identity in Physics: A Historical, Philosophical, and Formal Analysis", authors: ["Steven French", "Décio Krause"], year: 2006, kind: "book", sources: ["Crossref"] }),
  work({ id: "identity-book-b", title: "Identity in Physics", authors: ["French, Steven", "Krause, Decio"], year: 2006, kind: "book", sources: ["Open Library"] }),
  work({ id: "citing-paper", title: "Structuralism and Identity in Modern Physics", authors: ["Someone Else"], year: 2018, kind: "article", sources: ["Test"] }),
];
const advancedIdentity = mergeAndRankResults(identityResults, "Identity in Physics French Krause", { title: "Identity in Physics", authors: "French Krause", kind: "book", exactTitle: false });
assert.equal(advancedIdentity.length, 1, "advanced fields should exclude citing papers and consolidate book editions");
assert.equal(advancedIdentity[0].sources.length, 2);

const roleSeparated = mergeAndRankResults([
  work({ id: "metadata", title: "Role Separation", authors: ["Trusted Author"], publisher: "Trusted Publisher", metadataEligible: true, metadataSources: ["Trusted Metadata"], accessSources: [], sources: ["Trusted Metadata"] }),
  work({ id: "access", title: "Role Separation", authors: ["Trusted Author"], publisher: "Unselected Metadata", metadataEligible: false, metadataSources: [], accessSources: ["Access Catalog"], sources: ["Access Catalog"], accessLinks: [{ label: "Record", url: "https://example.org/access", source: "Access Catalog", kind: "record" }] }),
], "Role Separation");
assert.equal(roleSeparated[0].publisher, "Trusted Publisher", "an access-only source must not override selected metadata");
assert.equal(roleSeparated[0].accessLinks.length, 1, "access links remain available independently from metadata selection");

const partialAdvancedTitle = mergeAndRankResults([
  work({ id: "kripke", title: "Semantical Analysis of Modal Logic I", authors: ["Saul A. Kripke"], kind: "article" }),
], "Modal Logic Saul Kripke", { title: "Modal Logic", authors: "Saul Kripke", kind: "article", exactTitle: false });
assert.equal(partialAdvancedTitle.length, 1, "advanced title terms should match within a longer title unless exact title is requested");

console.log("PASS merge regression: variants consolidate while different works stay separate");

function work(overrides: Partial<WorkResult> & Pick<WorkResult, "id" | "title" | "authors">): WorkResult {
  return {
    year: 2020,
    kind: "article",
    identifiers: {},
    sources: ["Test"],
    accessLinks: [],
    ...overrides,
  };
}
