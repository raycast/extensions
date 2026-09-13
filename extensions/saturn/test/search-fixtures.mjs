/**
 * Fixture tests for the search engine (src/lib/search.ts): ranking buckets,
 * fuzzy/prefix matching, coverage, snippet windowing, index/sidecar skew
 * tolerance, and the in-memory fallback builder.
 *
 * Run: node test/search-fixtures.mjs
 */

import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildSync } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(mkdtempSync(path.join(os.tmpdir(), "saturn-search-")), "search.mjs");
buildSync({
  entryPoints: [path.join(__dirname, "../src/lib/search.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: outFile,
  logLevel: "silent",
});
const search = await import(pathToFileURL(outFile).href);
const {
  buildIndexFromLibrary,
  prepareIndex,
  searchLinks,
  buildSnippet,
  boldTerms,
  buildDetailMarkdown,
} = search;

let failures = 0;
function check(name, cond) {
  if (cond) {
    console.log(`  ok ${name}`);
  } else {
    failures++;
    console.error(`  FAIL ${name}`);
  }
}
const ids = (results) => results.map((r) => r.link.id);

const L = (id, title, tags, extra = {}) => ({
  id,
  url: `https://example.com/${id}`,
  title,
  collectionId: "c1",
  capturedAt: "2026-07-25T00:00:00.000Z",
  pinned: false,
  tags,
  ...extra,
});

const links = [
  L("a", "Compositing in CSS", ["rendering", "css"], {
    previewImagePath: "/tmp/some shot.png",
  }),
  L("b", "Weekly notes", ["compositing"]),
  L("c", "Random article"),
  L("d", "Design systems reading"),
];
const pageTexts = {
  c: `${"This long article explains rendering pipelines in great detail. ".repeat(12)}The compositing pipeline matters most.`,
  d: "Body text without anything relevant.",
};

const prepared = prepareIndex(buildIndexFromLibrary(links, pageTexts));
const run = (query, texts = pageTexts) =>
  searchLinks({ links, index: prepared, pageTexts: texts, query });

console.log("ranking + buckets");
{
  const r = run("compositing");
  check("title > tag > body order", JSON.stringify(ids(r)) === JSON.stringify(["a", "b", "c"]));
  check("title match is bucket 0", r[0].bucket === 0);
  check("tag match is bucket 0", r[1].bucket === 0);
  check("body-only match is bucket 1", r[2].bucket === 1);
  check("non-matching doc excluded", !ids(r).includes("d"));
}

console.log("fuzzy matching");
{
  const r = run("compositng"); // missing "i" — one edit
  check("typo still returns title/tag/body", JSON.stringify(ids(r)) === JSON.stringify(["a", "b", "c"]));
  const t = run("desing"); // transposition — one edit (OSA)
  check("transposition typo matches", ids(t).includes("d"));
  const no = run("zzx");
  check("gibberish returns nothing", no.length === 0);
  const short = run("xy");
  check("short tokens don't crash", Array.isArray(short));
}

console.log("prefix (as-you-type)");
{
  const r = run("compo");
  check("prefix matches compositing docs", ["a", "b", "c"].every((id) => ids(r).includes(id)));
}

console.log("coverage + title bonus");
{
  const r = run("css compositing");
  check("doc covering all terms ranks first", ids(r)[0] === "a");
  const bonus = run("weekly notes");
  check("exact full-title match wins", ids(bonus)[0] === "b");
}

console.log("snippets");
{
  const r = run("compositing");
  const body = r.find((x) => x.link.id === "c");
  check("body match has snippet", typeof body.snippet === "string");
  check("snippet is one line", !body.snippet.includes("\n"));
  check("snippet contains the term", body.snippet.toLowerCase().includes("compositing"));
  check("snippet stays short", body.snippet.length <= 160);
  check("title/tag matches carry no snippet", r[0].snippet === undefined && r[1].snippet === undefined);
  const tag = r.find((x) => x.link.id === "b");
  check("matched tag surfaced for chips", JSON.stringify(tag.matched.tags) === JSON.stringify(["compositing"]));
}

console.log("index/sidecar skew tolerance");
{
  const r = run("compositing", { d: pageTexts.d }); // c's text missing
  const body = r.find((x) => x.link.id === "c");
  check("body match still ranks (bucket 1)", body && body.bucket === 1);
  check("missing sidecar text → no snippet, no crash", body.snippet === undefined);
}

console.log("fallback builder round-trip");
{
  const roundTripped = prepareIndex(JSON.parse(JSON.stringify(buildIndexFromLibrary(links, pageTexts))));
  const a = searchLinks({ links, index: prepared, pageTexts, query: "compositing" });
  const b = searchLinks({ links, index: roundTripped, pageTexts, query: "compositing" });
  check("serialized index searches identically", JSON.stringify(ids(a)) === JSON.stringify(ids(b)));
}

console.log("highlight helpers");
{
  check("boldTerms bolds occurrence", boldTerms("compositing in css", ["compositing"]) === "**compositing** in css");
  check("boldTerms escapes markdown", boldTerms("a [b] *c*", []).includes("\\[b\\]"));
  const detail = buildDetailMarkdown({
    link: links[0],
    score: 1,
    bucket: 0,
    matched: { title: ["compositing"], tags: ["css"], bodyTerms: [] },
    snippet: undefined,
  });
  check("detail has fixed-height thumbnail", detail.startsWith("![](file:///tmp/some%20shot.png?raycast-height=280)"));
  check("title/tag match → body is thumbnail only", detail === "![](file:///tmp/some%20shot.png?raycast-height=280)");
  check("no 'in page' label in body", !detail.includes("in page"));
  check("tags not duplicated in body", !detail.includes("Tags:"));
  const browseDetail = buildDetailMarkdown({ link: links[0] });
  check("browse detail is thumbnail only", browseDetail === "![](file:///tmp/some%20shot.png?raycast-height=280)");
  const snippet = buildSnippet(pageTexts.c, ["compositing"]);
  const detailBody = buildDetailMarkdown({
    link: links[2],
    score: 1,
    bucket: 1,
    matched: { title: [], tags: [], bodyTerms: ["compositing"] },
    snippet,
  });
  check("body detail bolds snippet term", detailBody.includes("**compositing**"));
  check("body detail is the one snippet line only", detailBody === boldTerms(snippet, ["compositing"]));
  check("no italic 'in page' in body", !detailBody.includes("*in page*"));
}

console.log("empty / punctuation queries");
{
  check("empty query → no results", run("").length === 0);
  check("punctuation-only → no results", run("!!! ???").length === 0);
}

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nPASS search fixtures");
