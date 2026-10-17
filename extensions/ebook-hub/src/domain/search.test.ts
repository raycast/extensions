import { describe, expect, it } from "vitest";

import { buildSearchIndex, searchBook } from "./search";

const chapters = [
  "# Hồi một\n\nTrăm năm trong cõi người ta, chữ tài chữ mệnh khéo là ghét nhau.",
  "Second chapter mentions tài again.",
];

describe("searchBook", () => {
  const index = buildSearchIndex(chapters);

  it("ignores queries shorter than the minimum length", () => {
    expect(searchBook(index, " t ")).toEqual([]);
  });

  it("matches without diacritics and reports block positions", () => {
    expect(searchBook(index, "chu tai")).toEqual([
      { chapterIndex: 0, blockIndex: 1, excerpt: "Trăm năm trong cõi người ta, chữ tài chữ mệnh khéo là ghét nhau." },
    ]);
    expect(searchBook(index, "TÀI").map((hit) => [hit.chapterIndex, hit.blockIndex])).toEqual([
      [0, 1],
      [1, 0],
    ]);
  });

  it("prefixes an ellipsis when the match is far into the block", () => {
    const [hit] = searchBook(buildSearchIndex([`${"lorem ".repeat(20)}needle`]), "needle");
    expect(hit.excerpt.startsWith("…")).toBe(true);
    expect(hit.excerpt).toContain("needle");
  });

  it("caps the number of results", () => {
    const manyBlocks = Array.from({ length: 250 }, () => "needle here").join("\n\n");
    expect(searchBook(buildSearchIndex([manyBlocks]), "needle")).toHaveLength(200);
  });
});
