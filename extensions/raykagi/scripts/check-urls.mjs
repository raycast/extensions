// Dependency-free self-check for the URL builders / parsers (the billing + binding
// correctness path). Run: `node scripts/check-urls.mjs`. No test framework.
import assert from "node:assert/strict";
import {
  autosuggestUrl,
  bangQuicklink,
  bangSearchUrl,
  hostname,
  parseSuggestions,
  searchPageUrl,
  snippetToMarkdown,
  stripTags,
  summarizeQuicklink,
  summarizeUrl,
  translateQuicklink,
  translateUrl,
} from "../src/urls.ts";

// search + autosuggest: special chars are percent-encoded
assert.equal(searchPageUrl("c++ tutorial"), "https://kagi.com/search?q=c%2B%2B%20tutorial");
assert.equal(autosuggestUrl("a b"), "https://kagi.com/api/autosuggest?q=a%20b");

// bangs: "!" survives, space encoded; quicklink keeps {Query} + literal space raw
assert.equal(bangSearchUrl("g", "foo bar"), "https://kagi.com/search?q=!g%20foo%20bar");
assert.equal(bangSearchUrl("!w", "x"), "https://kagi.com/search?q=!w%20x");
assert.equal(bangQuicklink("g"), "https://kagi.com/search?q=!g {Query}");
assert.equal(bangQuicklink("!g"), "https://kagi.com/search?q=!g {Query}"); // leading ! stripped

// translate: options before text; defaults dropped; text encoded; quicklink keeps {Query}
assert.equal(
  translateUrl("hello world", { from: "auto", to: "ru", quality: "best" }),
  "https://translate.kagi.com/?from=auto&to=ru&quality=best&text=hello%20world",
);
assert.ok(!translateUrl("x", { from: "auto", quality: "standard", style: "natural" }).includes("quality"));
assert.equal(
  translateQuicklink({ from: "auto", to: "ru" }),
  "https://translate.kagi.com/?from=auto&to=ru&text={Query}",
);

// summarize: target url fully encoded so its ?/= don't break our query string
assert.equal(
  summarizeUrl("https://a.com/x?y=1", { summary: "takeaway", target_language: "RU" }),
  "https://kagi.com/summarizer/?url=https%3A%2F%2Fa.com%2Fx%3Fy%3D1&summary=takeaway&target_language=RU",
);
assert.ok(!summarizeUrl("https://a.com", { summary: "summary" }).includes("summary="));
assert.equal(summarizeQuicklink({}), "https://kagi.com/summarizer/?url={Query}");

// autosuggest parse: OpenSearch shape, defensive on junk
assert.deepEqual(parseSuggestions(["hi", ["a", "b"]]), ["a", "b"]);
assert.deepEqual(parseSuggestions(["hi"]), []);
assert.deepEqual(parseSuggestions(null), []);

// text helpers
assert.equal(stripTags("<b>Grand</b> Canyon"), "Grand Canyon");
assert.equal(snippetToMarkdown("<b>Grand</b> <i>x</i>"), "**Grand** x");
assert.equal(hostname("https://www.example.com/p"), "example.com");
assert.equal(hostname("not a url"), "not a url");

console.log("check-urls: all assertions passed ✓");
