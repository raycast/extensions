import index from "./data/search-index.json";

export type GlyphKind = "symbol" | "emoji" | "unicode";
export type GlyphKindFilter = "all" | GlyphKind;

export type SymbolEntry = {
  kind: "symbol";
  name: string;
  aliases: string[];
  categoryKeys: string[];
  categoryNames: string[];
  primaryCategory: string;
  tier: number;
};

export type EmojiEntry = {
  kind: "emoji";
  character: string;
  name: string;
  group: string;
  slug: string;
  skinToneSupport: boolean;
};

export type UnicodeEntry = {
  kind: "unicode";
  character: string;
  name: string;
  codePoint: string;
  codePointLabel: string;
  category: string;
  categoryName: string;
  generalCategory: string;
  aliases: string[];
};

export type GlyphEntry = SymbolEntry | EmojiEntry | UnicodeEntry;

export type SearchIndex = {
  counts: Record<GlyphKind, number>;
  symbols: SymbolEntry[];
  emoji: EmojiEntry[];
  unicode: UnicodeEntry[];
};

export type SearchResult = {
  entry: GlyphEntry;
  score: number;
};

const searchIndex = index as SearchIndex;
const maximumSearchResultsPerKind = 50;
const maximumBrowseResultsPerKind = 60;
const kindRank: Record<GlyphKind, number> = {
  symbol: 0,
  emoji: 1,
  unicode: 2,
};

export const counts = searchIndex.counts;
export const totalCount = counts.symbol + counts.emoji + counts.unicode;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);
}

function uniqueTokens(parts: string[]): string[] {
  return [...new Set(parts.flatMap(tokenize))];
}

function symbolSearchParts(entry: SymbolEntry): string[] {
  return [entry.name, ...entry.aliases, ...entry.categoryNames, entry.primaryCategory];
}

function emojiSearchParts(entry: EmojiEntry): string[] {
  return [entry.character, entry.name, entry.group, entry.slug.replaceAll("_", " ")];
}

function unicodeSearchParts(entry: UnicodeEntry): string[] {
  return [
    entry.character,
    entry.name,
    entry.codePoint,
    entry.codePointLabel,
    entry.categoryName,
    entry.generalCategory,
    ...entry.aliases,
  ];
}

function searchParts(entry: GlyphEntry): string[] {
  switch (entry.kind) {
    case "symbol":
      return symbolSearchParts(entry);
    case "emoji":
      return emojiSearchParts(entry);
    case "unicode":
      return unicodeSearchParts(entry);
  }
}

function displayName(entry: GlyphEntry): string {
  switch (entry.kind) {
    case "symbol":
      return entry.name;
    case "emoji":
    case "unicode":
      return entry.name;
  }
}

function copyValue(entry: GlyphEntry): string {
  switch (entry.kind) {
    case "symbol":
      return entry.name;
    case "emoji":
    case "unicode":
      return entry.character;
  }
}

function includesTokenPrefix(tokens: string[], queryToken: string): boolean {
  return tokens.some((token) => token.startsWith(queryToken));
}

function includesSubstring(tokens: string[], queryToken: string): boolean {
  return tokens.some((token) => token.includes(queryToken));
}

function normalizedSearchPhrase(text: string): string {
  return tokenize(text).join(" ");
}

function scoreEntry(entry: GlyphEntry, query: string, queryTokens: string[]): number | undefined {
  const parts = searchParts(entry);
  const tokens = uniqueTokens(parts);
  const tokenSet = new Set(tokens);
  const name = normalizedSearchPhrase(displayName(entry));
  const value = copyValue(entry).toLowerCase();
  const searchablePhrase = normalizedSearchPhrase(parts.join(" "));
  let score = kindRank[entry.kind] * 20;
  let matched = false;

  if (entry.kind === "symbol") {
    score += entry.tier * 80;
  }

  if (entry.kind === "unicode") {
    const normalizedCodePoint = query.replace(/^u\+|^0x/i, "").toUpperCase();
    if (entry.codePoint === normalizedCodePoint || entry.codePointLabel.toLowerCase() === query) {
      score -= 520;
      matched = true;
    }
  }

  if (value === query) {
    score -= 520;
    matched = true;
  } else if (name === query) {
    score -= 500;
    matched = true;
  } else if (name.startsWith(query)) {
    score -= 360;
    matched = true;
  } else if (name.includes(query)) {
    score -= 260;
    matched = true;
  } else if (searchablePhrase.includes(query)) {
    score -= 120;
    matched = true;
  }

  if (queryTokens.length === 0) {
    return matched ? score : undefined;
  }

  for (const token of queryTokens) {
    if (tokenSet.has(token)) {
      score += 0;
      matched = true;
    } else if (includesTokenPrefix(tokens, token)) {
      score += 18;
      matched = true;
    } else if (includesSubstring(tokens, token) || searchablePhrase.includes(token)) {
      score += 38;
      matched = true;
    } else {
      return undefined;
    }
  }

  score += Math.min(displayName(entry).length, 100) / 100;
  return score;
}

function entriesForFilter(kindFilter: GlyphKindFilter): GlyphEntry[] {
  switch (kindFilter) {
    case "symbol":
      return searchIndex.symbols;
    case "emoji":
      return searchIndex.emoji;
    case "unicode":
      return searchIndex.unicode;
    case "all":
      return [...searchIndex.symbols, ...searchIndex.emoji, ...searchIndex.unicode];
  }
}

function browseLimit(kindFilter: GlyphKindFilter): number {
  return kindFilter === "all" ? maximumBrowseResultsPerKind : maximumBrowseResultsPerKind * 3;
}

function searchLimit(kindFilter: GlyphKindFilter): number {
  return kindFilter === "all" ? maximumSearchResultsPerKind : maximumSearchResultsPerKind * 3;
}

export function searchGlyphs(searchText: string, kindFilter: GlyphKindFilter): SearchResult[] {
  const query = searchText.trim().toLowerCase();
  const queryTokens = tokenize(query);
  const entries = entriesForFilter(kindFilter);

  if (queryTokens.length === 0) {
    const remainingByKind: Record<GlyphKind, number> = {
      symbol: browseLimit(kindFilter),
      emoji: browseLimit(kindFilter),
      unicode: browseLimit(kindFilter),
    };
    return entries
      .filter((entry) => {
        if (remainingByKind[entry.kind] <= 0) {
          return false;
        }
        remainingByKind[entry.kind] -= 1;
        return true;
      })
      .map((entry, index) => ({ entry, score: index }));
  }

  const remainingByKind: Record<GlyphKind, number> = {
    symbol: searchLimit(kindFilter),
    emoji: searchLimit(kindFilter),
    unicode: searchLimit(kindFilter),
  };
  const results: SearchResult[] = [];
  for (const entry of entries) {
    const score = scoreEntry(entry, query, queryTokens);
    if (score === undefined) {
      continue;
    }
    results.push({ entry, score });
  }

  return results
    .sort((lhs, rhs) => {
      if (lhs.score !== rhs.score) {
        return lhs.score - rhs.score;
      }
      return displayName(lhs.entry).localeCompare(displayName(rhs.entry));
    })
    .filter((result) => {
      if (remainingByKind[result.entry.kind] <= 0) {
        return false;
      }
      remainingByKind[result.entry.kind] -= 1;
      return true;
    });
}

export function copyTextForEntry(entry: GlyphEntry): string {
  return copyValue(entry);
}
