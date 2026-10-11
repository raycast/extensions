import { countWords } from "./text";

/**
 * Oversized paragraphs are split into blocks of at most this many words. It is
 * a constant (not the page-size preference) so block indexes — and therefore
 * saved reading positions — stay stable when the page size changes.
 */
export const MAX_BLOCK_WORDS = 100;
export const MIN_WORDS_PER_PAGE = 100;
export const MAX_WORDS_PER_PAGE = 2000;
export const DEFAULT_WORDS_PER_PAGE = 350;

export interface Page {
  startBlock: number;
  /** Exclusive. */
  endBlock: number;
  words: number;
}

export interface PaginatedChapter {
  blocks: string[];
  pages: Page[];
}

const FENCE = /^\s*(```|~~~)/;
const SENTENCE_BOUNDARY = /(?<=[.!?…。！？]["'”’)\]]*)\s+/u;

export function clampWordsPerPage(raw: string | number): number {
  const value = typeof raw === "number" ? raw : Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) {
    return DEFAULT_WORDS_PER_PAGE;
  }
  return Math.min(MAX_WORDS_PER_PAGE, Math.max(MIN_WORDS_PER_PAGE, Math.round(value)));
}

/** Split Markdown into blank-line separated blocks, keeping fenced code intact. */
export function splitBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  let current: string[] = [];
  let fenceMarker: string | null = null;

  const flush = () => {
    if (current.some((line) => line.trim() !== "")) {
      blocks.push(current.join("\n"));
    }
    current = [];
  };

  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const fence = FENCE.exec(line);
    if (fenceMarker === null) {
      if (fence) {
        flush();
        fenceMarker = fence[1];
        current.push(line);
      } else if (line.trim() === "") {
        flush();
      } else {
        current.push(line);
      }
    } else {
      current.push(line);
      if (fence && fence[1] === fenceMarker) {
        fenceMarker = null;
        flush();
      }
    }
  }

  flush();
  return blocks;
}

function chunkCharacters(text: string, size: number): string[] {
  const characters = Array.from(text);
  const chunks: string[] = [];
  for (let index = 0; index < characters.length; index += size) {
    chunks.push(characters.slice(index, index + size).join(""));
  }
  return chunks;
}

function packPieces(pieces: string[], maxWords: number): string[] {
  const chunks: string[] = [];
  let current: string[] = [];
  let currentWords = 0;

  for (const piece of pieces) {
    const words = countWords(piece);
    if (currentWords > 0 && currentWords + words > maxWords) {
      chunks.push(current.join(" "));
      current = [];
      currentWords = 0;
    }
    current.push(piece);
    currentWords += words;
  }

  if (current.length > 0) {
    chunks.push(current.join(" "));
  }
  return chunks;
}

function splitByWords(text: string, maxWords: number): string[] {
  const pieces = text
    .split(/\s+/)
    .filter((word) => word !== "")
    .flatMap((word) => (countWords(word) > maxWords ? chunkCharacters(word, maxWords) : [word]));
  return packPieces(pieces, maxWords);
}

export function splitOversizedBlock(block: string, maxWords: number): string[] {
  if (FENCE.test(block) || countWords(block) <= maxWords) {
    return [block];
  }
  const pieces = block
    .split(SENTENCE_BOUNDARY)
    .flatMap((sentence) => (countWords(sentence) > maxWords ? splitByWords(sentence, maxWords) : [sentence]));
  return packPieces(pieces, maxWords);
}

export function prepareBlocks(markdown: string): string[] {
  return splitBlocks(markdown).flatMap((block) => splitOversizedBlock(block, MAX_BLOCK_WORDS));
}

/** Greedy page packing. Always returns at least one page. */
export function paginate(blocks: readonly string[], wordsPerPage: number): Page[] {
  const pages: Page[] = [];
  let startBlock = 0;
  let words = 0;

  blocks.forEach((block, index) => {
    const blockWords = countWords(block);
    if (index > startBlock && words + blockWords > wordsPerPage) {
      pages.push({ startBlock, endBlock: index, words });
      startBlock = index;
      words = 0;
    }
    words += blockWords;
  });

  pages.push({ startBlock, endBlock: blocks.length, words });
  return pages;
}

export function paginateChapter(markdown: string, wordsPerPage: number): PaginatedChapter {
  const blocks = prepareBlocks(markdown);
  return { blocks, pages: paginate(blocks, wordsPerPage) };
}

/** Index of the page containing `blockIndex`, clamped to the chapter. */
export function pageIndexForBlock(pages: readonly Page[], blockIndex: number): number {
  const index = pages.findIndex((page) => blockIndex < page.endBlock);
  return index === -1 ? Math.max(0, pages.length - 1) : index;
}

export function pageMarkdown(chapter: PaginatedChapter, page: Page): string {
  return chapter.blocks.slice(page.startBlock, page.endBlock).join("\n\n");
}
