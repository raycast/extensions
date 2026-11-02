import assert from "node:assert/strict";
import { test } from "node:test";
import { parseURLInput, formatPage, formatSearchResult, getContentText } from "../src/content.ts";

test("URL input accepts lines/spaces, deduplicates, and enforces the batch limit", () => {
  assert.deepEqual(parseURLInput("https://example.com\nhttps://example.org  https://example.com"), [
    "https://example.com",
    "https://example.org",
  ]);
  assert.throws(() => parseURLInput("  "), /at least one/);
  assert.throws(() => parseURLInput("example.com"), /complete http/);
  assert.throws(() => parseURLInput("file:///etc/passwd"), /complete http/);
  assert.throws(
    () => parseURLInput(Array.from({ length: 11 }, (_, i) => `https://example.com/${i}`).join("\n")),
    /up to 10/,
  );
});

test("JSON content is copied as readable JSON and displayed as code", () => {
  const page = { url: "https://example.com", format: "json", text: { type: "document", children: [] } };
  assert.equal(getContentText(page), JSON.stringify(page.text, null, 2));
  assert.match(formatPage(page), /```json\n/);
  assert.doesNotMatch(formatPage(page), /\[object Object\]/);
});

test("HTML is shown as source and embedded backticks cannot end its code block", () => {
  const page = { url: "https://example.com", format: "html", text: "<p>```text</p>" };
  assert.match(formatPage(page), /````html\n<p>```text<\/p>\n````$/);
});

test("academic details include authors, venue, publication year and zero citations", () => {
  const markdown = formatSearchResult({
    title: "Paper",
    url: "https://example.com",
    position: 1,
    authors: ["One", "Two"],
    venue: "Journal",
    year: 2026,
    cited_by_count: 0,
  });
  assert.match(markdown, /One, Two/);
  assert.match(markdown, /\*\*Venue:\*\* Journal/);
  assert.match(markdown, /\*\*Year:\*\* 2026/);
  assert.match(markdown, /\*\*Citations:\*\* 0/);
});

test("failed extraction explains selector misses and keeps retry hints", async () => {
  const { formatFetchError } = await import("../src/content.ts");
  const message = formatFetchError({
    url: "https://example.com",
    error: "selector_not_matched",
    candidate_selectors: ["main", "#content"],
  });
  assert.match(message, /No content matched/);
  assert.match(message, /main, #content/);
  assert.match(
    formatFetchError({ url: "https://example.com/file.pdf", error: "selector_unsupported" }),
    /does not support CSS selectors/,
  );
});
