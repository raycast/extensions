import { pinyin } from "pinyin-pro";
import type { PromptProps } from "../managers/prompt-manager";

interface PromptSearchToken {
  origin: string;
  readings: readonly string[];
}

interface PromptSearchEntry {
  prompt: PromptProps;
  normalizedTitle: string;
  tokens: readonly PromptSearchToken[];
}

export interface PromptSearchIndex {
  prompts: PromptProps[];
  entries: readonly PromptSearchEntry[];
}

const characterReadingsCache = new Map<string, readonly string[]>();
const titleSearchDataCache = new Map<string, { normalizedTitle: string; tokens: readonly PromptSearchToken[] }>();

export function normalizeTextForSearch(text: string): string {
  const lowerText = text.toLowerCase();
  const leadingSpecialMatch = lowerText.match(/^[^\p{L}\p{N}]+/u);
  const leadingSpecial = leadingSpecialMatch ? leadingSpecialMatch[0] : "";
  const normalizedBody = lowerText.replace(/[^\p{L}\p{N}]/gu, "");
  return leadingSpecial + normalizedBody;
}

export function getAllDescendants(prompts: PromptProps[]): PromptProps[] {
  const results: PromptProps[] = [];
  const seen = new Set<PromptProps>();

  const collect = (prompt: PromptProps) => {
    if (seen.has(prompt)) {
      return;
    }
    seen.add(prompt);
    results.push(prompt);
    prompt.subprompts?.forEach(collect);
  };

  prompts.forEach(collect);
  return results;
}

export function createPromptSearchIndex(prompts: PromptProps[]): PromptSearchIndex {
  const flattenedPrompts = getAllDescendants(prompts);
  const entries = flattenedPrompts.map((prompt) => {
    let searchData = titleSearchDataCache.get(prompt.title);
    if (!searchData) {
      searchData = {
        normalizedTitle: normalizeTextForSearch(prompt.title),
        tokens: Array.from(prompt.title.toLowerCase(), (origin) => ({
          origin,
          readings: getCharacterReadings(origin),
        })),
      };
      titleSearchDataCache.set(prompt.title, searchData);
    }

    return { prompt, ...searchData };
  });

  return { prompts: flattenedPrompts, entries };
}

export function searchPromptIndex(index: PromptSearchIndex, searchText: string): PromptProps[] {
  const trimmedSearchText = searchText.trim();
  if (!trimmedSearchText) {
    return index.prompts;
  }

  const normalizedSearchText = normalizeTextForSearch(trimmedSearchText);
  const pinyinQuery = trimmedSearchText.toLowerCase().replace(/\s/g, "");

  return index.entries
    .filter(
      ({ normalizedTitle, tokens }) =>
        normalizedTitle.includes(normalizedSearchText) || matchesPinyinTokens(tokens, pinyinQuery),
    )
    .map(({ prompt }) => prompt);
}

function getCharacterReadings(origin: string): readonly string[] {
  const cached = characterReadingsCache.get(origin);
  if (cached) {
    return cached;
  }

  const readings = Array.from(
    new Set(
      pinyin(origin, {
        type: "array",
        toneType: "none",
        multiple: true,
        v: false,
      }).map((reading) => reading.toLowerCase()),
    ),
  );
  characterReadingsCache.set(origin, readings);
  return readings;
}

// Boolean equivalent of pinyin-pro's match(text, query, { continuous: true })
// for the options used by Prompt Lab. The expensive character-to-pinyin work is
// performed once while building the index instead of on every keystroke.
function matchesPinyinTokens(tokens: readonly PromptSearchToken[], query: string): boolean {
  if (!query) {
    return false;
  }

  let currentOffsets = new Uint8Array(query.length + 1);
  let nextOffsets = new Uint8Array(query.length + 1);
  currentOffsets[0] = 1;

  for (const token of tokens) {
    // pinyin-pro's default `space: "ignore"` carries matching state over ASCII spaces.
    if (token.origin === " ") {
      continue;
    }

    nextOffsets.fill(0);
    // A continuous match may begin at any title character.
    nextOffsets[0] = 1;

    for (let offset = 0; offset < query.length; offset += 1) {
      if (currentOffsets[offset] === 0) {
        continue;
      }

      if (token.origin === query[offset]) {
        if (offset + 1 === query.length) {
          return true;
        }
        nextOffsets[offset + 1] = 1;
      }

      const remainingQuery = query.slice(offset);
      let fullReadingLength: number | undefined;
      for (const reading of token.readings) {
        // pinyin-pro uses `lastPrecision: "start"`; its internal boundary is
        // expressed as `query.length - position <= 6`, which permits 7 characters.
        if (remainingQuery.length <= 7 && reading.startsWith(remainingQuery)) {
          return true;
        }

        if (reading[0] === query[offset]) {
          if (offset + 1 === query.length) {
            return true;
          }
          nextOffsets[offset + 1] = 1;
        }

        if (fullReadingLength === undefined && query.startsWith(reading, offset)) {
          fullReadingLength = reading.length;
        }
      }

      // pinyin-pro intentionally advances only through the first full reading
      // that matches, even when a later polyphonic reading would also match.
      if (fullReadingLength !== undefined) {
        const nextOffset = offset + fullReadingLength;
        if (nextOffset === query.length) {
          return true;
        }
        nextOffsets[nextOffset] = 1;
      }
    }

    [currentOffsets, nextOffsets] = [nextOffsets, currentOffsets];
  }

  return false;
}
