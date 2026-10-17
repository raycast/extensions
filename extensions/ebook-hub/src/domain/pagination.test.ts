import { describe, expect, it } from "vitest";

import {
  DEFAULT_WORDS_PER_PAGE,
  MAX_BLOCK_WORDS,
  clampWordsPerPage,
  pageIndexForBlock,
  pageMarkdown,
  paginate,
  paginateChapter,
  prepareBlocks,
  splitBlocks,
  splitOversizedBlock,
} from "./pagination";
import { countWords } from "./text";

const words = (count: number) => Array.from({ length: count }, () => "word").join(" ");

describe("splitBlocks", () => {
  it("splits on blank lines and keeps fenced code intact", () => {
    const markdown = [
      "# Title",
      "",
      "First paragraph",
      "continues here.",
      "",
      "```ts",
      "const a = 1;",
      "",
      "const b = 2;",
      "```",
      "",
      "Last.",
    ].join("\n");

    expect(splitBlocks(markdown)).toEqual([
      "# Title",
      "First paragraph\ncontinues here.",
      "```ts\nconst a = 1;\n\nconst b = 2;\n```",
      "Last.",
    ]);
  });
});

describe("prepareBlocks", () => {
  it("splits oversized paragraphs at sentence boundaries", () => {
    const paragraph = Array.from({ length: 10 }, () => `${words(30)}.`).join(" ");
    const blocks = prepareBlocks(paragraph);

    expect(blocks.length).toBeGreaterThan(1);
    blocks.forEach((block) => expect(countWords(block)).toBeLessThanOrEqual(MAX_BLOCK_WORDS));
    expect(blocks.join(" ")).toBe(paragraph);
  });

  it("splits CJK text without spaces by characters", () => {
    expect(prepareBlocks("字".repeat(250)).map(countWords)).toEqual([100, 100, 50]);
  });

  it("never splits fenced code blocks", () => {
    const code = `\`\`\`\n${words(150)}\n\`\`\``;
    expect(splitOversizedBlock(code, 100)).toEqual([code]);
  });
});

describe("paginate", () => {
  const blocks = [words(60), words(60), words(60), words(200)];

  it("packs blocks greedily by word budget", () => {
    expect(paginate(blocks, 150)).toEqual([
      { startBlock: 0, endBlock: 2, words: 120 },
      { startBlock: 2, endBlock: 3, words: 60 },
      { startBlock: 3, endBlock: 4, words: 200 },
    ]);
  });

  it("returns one empty page for an empty chapter", () => {
    expect(paginate([], 350)).toEqual([{ startBlock: 0, endBlock: 0, words: 0 }]);
  });

  it("finds the page containing a block and clamps past the end", () => {
    const pages = paginate(blocks, 150);
    expect([0, 1, 2, 3].map((block) => pageIndexForBlock(pages, block))).toEqual([0, 0, 1, 2]);
    expect(pageIndexForBlock(pages, Number.MAX_SAFE_INTEGER)).toBe(2);
  });

  it("keeps a block anchor on screen when the page size changes", () => {
    for (const size of [100, 150, 1000]) {
      const pages = paginate(blocks, size);
      const page = pages[pageIndexForBlock(pages, 2)];
      expect(page.startBlock).toBeLessThanOrEqual(2);
      expect(page.endBlock).toBeGreaterThan(2);
    }
  });

  it("paginates a chapter and renders a page back to Markdown", () => {
    const chapter = paginateChapter("First.\n\nSecond.", 350);
    expect(chapter).toEqual({ blocks: ["First.", "Second."], pages: [{ startBlock: 0, endBlock: 2, words: 2 }] });
    expect(pageMarkdown(chapter, chapter.pages[0])).toBe("First.\n\nSecond.");
  });
});

describe("clampWordsPerPage", () => {
  it("parses, clamps, and falls back to the default", () => {
    expect(clampWordsPerPage("abc")).toBe(DEFAULT_WORDS_PER_PAGE);
    expect(clampWordsPerPage("50")).toBe(100);
    expect(clampWordsPerPage("5000")).toBe(2000);
    expect(clampWordsPerPage("420")).toBe(420);
    expect(clampWordsPerPage(420.6)).toBe(421);
  });
});
