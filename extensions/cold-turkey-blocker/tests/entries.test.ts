import assert from "node:assert/strict";
import test from "node:test";
import { initialBlockEntries, parseEntryLines, summarizeEntryCounts } from "../src/lib/entries";

test("parses optional multiline entries and removes exact duplicates", () => {
  assert.deepEqual(parseEntryLines("  youtube.com  \n\nreddit.com\r\nyoutube.com\n*social*  "), [
    "youtube.com",
    "reddit.com",
    "*social*",
  ]);
  assert.deepEqual(parseEntryLines("\n  \n"), []);
});

test("builds the initial website and exception plan in form order", () => {
  const entries = initialBlockEntries("youtube.com\nreddit.com", "docs.example.com\nyoutube.com");

  assert.deepEqual(entries, [
    { kind: "website", entry: "youtube.com" },
    { kind: "website", entry: "reddit.com" },
    { kind: "exception", entry: "docs.example.com" },
    { kind: "exception", entry: "youtube.com" },
  ]);
  assert.equal(summarizeEntryCounts(entries), "2 websites and 2 exceptions");
});

test("summarizes singular initial entry counts", () => {
  assert.equal(
    summarizeEntryCounts([
      { kind: "website", entry: "youtube.com" },
      { kind: "exception", entry: "docs.example.com" },
    ]),
    "1 website and 1 exception",
  );
});
