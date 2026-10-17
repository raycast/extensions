import { prepareBlocks } from "./pagination";
import { markdownToPlainText, normalizeForSearch, truncate } from "./text";

export const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 200;
const EXCERPT_BEFORE = 40;
const EXCERPT_LENGTH = 120;

interface IndexedBlock {
  chapterIndex: number;
  blockIndex: number;
  plain: string;
  normalized: string;
}

export interface SearchHit {
  chapterIndex: number;
  blockIndex: number;
  excerpt: string;
}

export type BookSearchIndex = IndexedBlock[];

export function buildSearchIndex(chapters: readonly string[]): BookSearchIndex {
  return chapters.flatMap((markdown, chapterIndex) =>
    prepareBlocks(markdown).map((block, blockIndex) => {
      const plain = markdownToPlainText(block);
      return { chapterIndex, blockIndex, plain, normalized: normalizeForSearch(plain) };
    }),
  );
}

export function searchBook(index: BookSearchIndex, query: string): SearchHit[] {
  const needle = normalizeForSearch(query);
  if (needle.length < MIN_QUERY_LENGTH) {
    return [];
  }

  const hits: SearchHit[] = [];
  for (const block of index) {
    const position = block.normalized.indexOf(needle);
    if (position === -1) {
      continue;
    }
    // Diacritic stripping keeps precomposed text the same length, so the
    // normalized offset is a close approximation of the original offset.
    const start = Math.max(0, position - EXCERPT_BEFORE);
    const excerpt = truncate(block.plain.slice(start), EXCERPT_LENGTH);
    hits.push({
      chapterIndex: block.chapterIndex,
      blockIndex: block.blockIndex,
      excerpt: start > 0 ? `…${excerpt}` : excerpt,
    });
    if (hits.length >= MAX_RESULTS) {
      break;
    }
  }
  return hits;
}
