import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSources } from "./helpers.mjs";
const { bookmarkDestination } = loadSources()("bookmarks");
const bookmark = {
  bookmarkId: 1,
  slot: 0,
  title: "Sample",
  snippet: null,
  blockType: 1,
  blockIdentifier: 14,
  bookNumber: null,
  chapterNumber: null,
  documentId: 1102017163,
  keySymbol: "rr",
  mepsLanguage: 0,
  type: 0,
};

test("English language id zero is preserved instead of being treated as absent", () => {
  const link = new URL(bookmarkDestination(bookmark, [], { 0: "E", 2: "X" }).url);
  assert.equal(link.searchParams.get("wtlocale"), "E");
  assert.equal(link.searchParams.get("par"), "14");
});
test("unknown bookmark languages are explained rather than silently opened in German", () => {
  const result = bookmarkDestination({ ...bookmark, mepsLanguage: 9999 }, [], {});
  assert.equal(result.url, undefined);
  assert.match(result.reason, /language/);
});
test("chapter bookmarks and verse bookmarks have different anchors", () => {
  const bible = {
    ...bookmark,
    bookNumber: 45,
    chapterNumber: 8,
    documentId: null,
    keySymbol: "nwtsty",
    mepsLanguage: 2,
  };
  assert.equal(
    new URL(
      bookmarkDestination({ ...bible, blockType: 0, blockIdentifier: null }, [], { 2: "X" }).url,
    ).searchParams.get("bible"),
    "45008",
  );
  assert.equal(
    new URL(bookmarkDestination({ ...bible, blockType: 2, blockIdentifier: 28 }, [], { 2: "X" }).url).searchParams.get(
      "bible",
    ),
    "45008028",
  );
});
test("unsupported media bookmarks remain visible with an explanation", () => {
  const result = bookmarkDestination({ ...bookmark, type: 2 }, [], { 0: "E" });
  assert.equal(result.url, undefined);
  assert.match(result.reason, /Audio and video/);
});
test("publication language matching is exact and supports undated magazine symbols", () => {
  const publications = [
    { folderName: "w_E_202601", symbol: "w26", undatedSymbol: "w", language: 0 },
    { folderName: "rr_X", symbol: "rr", language: 2 },
  ];
  assert.equal(
    bookmarkDestination({ ...bookmark, keySymbol: "w" }, publications, { 0: "E" }).publication.folderName,
    "w_E_202601",
  );
});
