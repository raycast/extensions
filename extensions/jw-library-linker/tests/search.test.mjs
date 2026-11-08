import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSources } from "./helpers.mjs";
const load = loadSources();
const {
  findBibleReferenceBooks,
  findPublicationCandidates,
  findPublicationMatch,
  isBibleReference,
  normalizeText,
  parseBibleReference,
} = load("search");
const { buildChapterResults, buildPublicationItems, getPublicationLink, getDocumentLink } = load("publications");
const { BIBLE_VERSE_COUNTS } = load("bible-verses");

for (const [input, bookId, chapter, verseStart, verseEnd] of [
  ["1Mo 1:1", 1, 1, 1, null],
  ["Römer 8:28", 45, 8, 28, null],
  ["1.Chr2:3,4", 13, 2, 3, 4],
  ["Psalm 23:1-6", 19, 23, 1, 6],
  ["  RÖMER\t8 : 28  ", 45, 8, 28, null],
  ["Ro\u0308mer 8:28", 45, 8, 28, null],
  ["Romer 8:28", 45, 8, 28, null],
]) {
  test(`parses Bible reference ${JSON.stringify(input)}`, () => {
    const parsed = parseBibleReference(input);
    assert.ok(parsed);
    assert.equal(parsed.book.id, bookId);
    assert.equal(parsed.chapter, chapter);
    assert.equal(parsed.verseStart, verseStart);
    assert.equal(parsed.verseEnd, verseEnd);
    assert.equal(isBibleReference(input), true);
  });
}

test("rejects malformed references and unencodable or descending ranges", () => {
  for (const input of [
    "",
    "unknown 1:1",
    "1Mo 1:",
    "1Mo 0:1",
    "1Mo 1:0",
    "1Mo 1000:1",
    "1Mo 1:1000",
    "1Mo 1:2-1",
    "1Mo 1:2-0",
    "1Mo 1:1-1000",
    "1Mo 1:1,3",
    "1Mo 1:1 trailing",
    "1Mo 1:1,2,3",
  ]) {
    assert.equal(parseBibleReference(input), null, input);
  }
});

test("recognizes incomplete Bible input so it can display a validation message", () => {
  assert.equal(isBibleReference("1Mo 1:"), true);
  assert.equal(isBibleReference("1Mo 1:1 trailing"), true);
  assert.equal(isBibleReference("unknown 1:1"), false);
  assert.equal(isBibleReference("it_X kingdom"), false);
});

test("normalizes composed and decomposed German text consistently", () => {
  assert.equal(normalizeText("  RÖMER  "), "romer");
  assert.equal(normalizeText("Ro\u0308mer"), "romer");
});

test("ambiguous Bible aliases require an explicit book instead of silently choosing one", () => {
  for (const [query, expectedIds] of [
    ["jo 1:1", [6, 29]],
    ["he 1:1", [26, 58]],
  ]) {
    assert.equal(isBibleReference(query), true);
    assert.deepEqual(
      findBibleReferenceBooks(query).map((book) => book.id),
      expectedIds,
    );
    assert.equal(parseBibleReference(query), null);
  }
  for (const [query, expectedId] of [
    ["Josua 1:1", 6],
    ["Joel 1:1", 29],
    ["Hesekiel 1:1", 26],
    ["Hebräer 1:1", 58],
  ]) {
    assert.equal(parseBibleReference(query).book.id, expectedId);
  }
});

const publications = [{ folderName: "it_X" }, { folderName: "it_X_2025" }];

test("matches a complete publication folder regardless of case", () => {
  assert.deepEqual(findPublicationMatch("IT_x\tKingdom", publications), {
    publication: publications[0],
    filter: "Kingdom",
  });
  assert.deepEqual(findPublicationMatch("it_X", publications), {
    publication: publications[0],
    filter: "",
  });
});

test("selects the exact publication when folder names share a prefix", () => {
  assert.deepEqual(findPublicationMatch("it_X_2025 kingdom", publications), {
    publication: publications[1],
    filter: "kingdom",
  });
});

test("does not interpret a partial or extended folder name as a chapter query", () => {
  for (const input of ["it", "it_Xextra kingdom", "it_X_202 kingdom", ""]) {
    assert.equal(findPublicationMatch(input, publications), null, input);
  }
});

test("publication results offer a native app link as well as the existing copy text", () => {
  const [item] = buildPublicationItems([
    {
      folderName: "rr_X",
      name: "Pure Worship",
      symbol: "rr",
      fileName: "rr_X.db",
    },
  ]);
  assert.equal(item.title, "Pure Worship");
  assert.equal(item.copyText, "rr_X ");
  assert.equal(item.chapterSearch, "rr_X ");
  const link = new URL(item.url);
  assert.equal(link.protocol, "jwlibrary:");
  assert.equal(link.pathname, "/finder");
  assert.equal(link.searchParams.get("pub"), "rr");
  assert.equal(link.searchParams.get("wtlocale"), "X");
});

test("magazine links identify the selected issue and its undated publication symbol", () => {
  const link = new URL(
    getPublicationLink({
      folderName: "w_X_202502",
      name: "Watchtower February 2025",
      symbol: "w25",
      undatedSymbol: "w",
      issueId: 20250200,
      fileName: "w_X_202502.db",
    }),
  );
  assert.equal(link.searchParams.get("pub"), "w");
  assert.equal(link.searchParams.get("issue"), "20250200");
});

test("publication links preserve the installed language and omit absent issues", () => {
  const link = new URL(
    getPublicationLink({
      folderName: "lff_E",
      name: "Enjoy Life Forever",
      symbol: "lff",
      fileName: "lff_E.db",
    }),
  );
  assert.equal(link.searchParams.get("wtlocale"), "E");
  assert.equal(link.searchParams.has("issue"), false);
});

test("magazines without an undated manifest symbol use the folder's base symbol", () => {
  const link = new URL(
    getPublicationLink({
      folderName: "g_X_202501",
      name: "Awake",
      symbol: "g25",
      issueId: 20250100,
      fileName: "g_X_202501.db",
    }),
  );
  assert.equal(link.searchParams.get("pub"), "g");
});

test("chapter and bookmark links target JW Library and retain document and paragraph identifiers", () => {
  const chapter = new URL(getDocumentLink("1102023001", "E"));
  assert.equal(chapter.protocol, "jwlibrary:");
  assert.equal(chapter.searchParams.get("docid"), "1102023001");
  assert.equal(chapter.searchParams.get("wtlocale"), "E");
  assert.equal(chapter.searchParams.has("par"), false);

  const bookmark = new URL(getDocumentLink(1102023001, "X", 14));
  assert.equal(bookmark.protocol, "jwlibrary:");
  assert.equal(bookmark.searchParams.get("par"), "14");
  assert.equal(new URL(getDocumentLink(1102023001, "X", null)).searchParams.has("par"), false);
});

const book = { folderName: "rr_X", name: "Pure Worship", symbol: "rr", fileName: "rr_X.db" };
const chapters = [
  { documentId: 0, mepsDocumentId: 1102017160, chapterNumber: null, title: "Contents", class: 1 },
  { documentId: 5, mepsDocumentId: 1102017161, chapterNumber: 1, title: "Jehova sollst du anbeten", class: 1 },
  { documentId: 8, mepsDocumentId: 1102017163, chapterNumber: 3, title: "Visionen Gottes", class: 1 },
  { documentId: 19, mepsDocumentId: 1102017173, chapterNumber: 13, title: "Drei Versprechen", class: 11 },
];

test("chapter browsing includes front matter and labels numbered chapters", () => {
  const items = buildChapterResults(book, chapters, "");
  assert.equal(items.length, 4);
  assert.equal(items[0].title, "Contents");
  assert.equal(items[1].title, "1. Jehova sollst du anbeten");
  assert.equal(items[1].subtitle, "Pure Worship");
});

test("a chapter number selects exactly that chapter rather than document row or title digits", () => {
  const items = buildChapterResults(book, chapters, "3");
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "rr_X-8");
  const link = new URL(items[0].url);
  assert.equal(link.protocol, "jwlibrary:");
  assert.equal(link.searchParams.get("docid"), "1102017163");
  assert.equal(link.searchParams.get("wtlocale"), "X");
  assert.deepEqual(buildChapterResults(book, chapters, "99"), []);
  assert.deepEqual(buildChapterResults(book, chapters, "0"), []);
});

test("chapter browsing still supports case-insensitive title search and class filters", () => {
  assert.equal(buildChapterResults(book, chapters, "GOTTES")[0].id, "rr_X-8");
  assert.deepEqual(buildChapterResults(book, chapters, "3", { classes: [11] }), []);
  assert.equal(buildChapterResults(book, chapters, "", { classes: [11] })[0].id, "rr_X-19");
});

test("index searches can retain numeric title searches", () => {
  const rows = [{ ...chapters[1], title: "1914" }];
  assert.deepEqual(buildChapterResults(book, rows, "1914"), []);
  assert.equal(buildChapterResults(book, rows, "1914", { matchChapterNumbers: false }).length, 1);
});

test("a unique short publication symbol can select chapters", () => {
  assert.deepEqual(findPublicationMatch("rr 3", [book]), { publication: book, filter: "3" });
  assert.deepEqual(findPublicationMatch("RR vision", [book]), { publication: book, filter: "vision" });
  assert.equal(findPublicationMatch("rr", [book]), null);
});

test("short chapter queries do not silently pick between installed editions", () => {
  const englishBook = { ...book, folderName: "rr_E" };
  assert.equal(findPublicationMatch("rr 3", [book, englishBook]), null);
  assert.deepEqual(findPublicationMatch("rr_X 3", [book, englishBook]), { publication: book, filter: "3" });
});

test("documents without a shared identifier retain a publication fallback", () => {
  const [item] = buildChapterResults(book, [{ ...chapters[0], mepsDocumentId: null }], "");
  assert.equal(new URL(item.url).searchParams.get("pub"), "rr");
});

test("Bible references respect actual chapter and verse bounds", () => {
  for (const input of ["1Mo 51:1", "1Mo 999:999", "1Mo 1:32", "1Mo 1:30-32", "Psalm 151:1", "Judas 2:1", "3Joh 1:15"])
    assert.equal(parseBibleReference(input), null, input);
  for (const input of ["1Mo 50:26", "Psalm 119:176", "Judas 1:25", "3Joh 1:14"])
    assert.ok(parseBibleReference(input), input);
  assert.equal(BIBLE_VERSE_COUNTS.length, 66);
  assert.equal(
    BIBLE_VERSE_COUNTS.reduce((sum, chapters) => sum + chapters.length, 0),
    1189,
  );
});
test("ambiguous short publication queries expose every edition for selection", () => {
  const editions = [book, { ...book, folderName: "rr_E" }];
  const matches = findPublicationCandidates("rr 3", editions);
  assert.equal(matches.publications.length, 2);
  assert.equal(matches.filter, "3");
});
