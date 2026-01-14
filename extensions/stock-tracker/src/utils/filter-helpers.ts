import { StockItem, WatchlistItem } from "../types";
import { normalizeTurkishChars } from "./text-helpers";

// ============================================================================
// Relevance Scoring Constants
// ============================================================================

const RELEVANCE_SCORES = {
  EXACT_MATCH: 1000,
  STARTS_WITH: 500,
  SYMBOL_EXACT_MATCH: 300,
  SYMBOL_STARTS_WITH: 200,
  NAME_CONTAINS: 100,
  SYMBOL_CONTAINS: 50,
  WORD_STARTS_WITH_NAME: 30,
  WORD_STARTS_WITH_SYMBOL: 20,
  WORD_CONTAINS_NAME: 10,
  WORD_CONTAINS_SYMBOL: 5,
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalizes and extracts searchable fields from a stock
 */
function normalizeStockFields<T extends StockItem | WatchlistItem>(stock: T) {
  const name = normalizeTurkishChars((stock.name || "").toLowerCase());
  const symbol = normalizeTurkishChars(stock.symbol.toLowerCase());
  const symbolOnly = symbol.includes(":") ? symbol.split(":")[1] : symbol;

  return { name, symbol, symbolOnly };
}

/**
 * Checks if any field exactly matches the query
 */
function hasExactMatch(name: string, symbol: string, symbolOnly: string, query: string): boolean {
  return name === query || symbol === query || symbolOnly === query;
}

/**
 * Checks if any field starts with the query
 */
function hasStartsWithMatch(name: string, symbol: string, symbolOnly: string, query: string): boolean {
  return name.startsWith(query) || symbol.startsWith(query) || symbolOnly.startsWith(query);
}

/**
 * Checks if symbol fields exactly match the query
 */
function hasSymbolExactMatch(symbol: string, symbolOnly: string, query: string): boolean {
  return symbol === query || symbolOnly === query;
}

/**
 * Checks if symbol fields start with the query
 */
function hasSymbolStartsWithMatch(symbol: string, symbolOnly: string, query: string): boolean {
  return symbol.startsWith(query) || symbolOnly.startsWith(query);
}

/**
 * Calculates word-based relevance score
 */
function calculateWordScore(name: string, symbol: string, symbolOnly: string, queryWords: string[]): number {
  let score = 0;

  queryWords.forEach((word) => {
    if (name.startsWith(word)) {
      score += RELEVANCE_SCORES.WORD_STARTS_WITH_NAME;
    }
    if (symbol.startsWith(word) || symbolOnly.startsWith(word)) {
      score += RELEVANCE_SCORES.WORD_STARTS_WITH_SYMBOL;
    }
    if (name.includes(word)) {
      score += RELEVANCE_SCORES.WORD_CONTAINS_NAME;
    }
    if (symbol.includes(word) || symbolOnly.includes(word)) {
      score += RELEVANCE_SCORES.WORD_CONTAINS_SYMBOL;
    }
  });

  return score;
}

/**
 * Calculates a relevance score for a stock based on search query
 * Higher score means better match - used for sorting search results
 */
function calculateRelevanceScore<T extends StockItem | WatchlistItem>(stock: T, query: string): number {
  const normalizedQuery = normalizeTurkishChars(query.toLowerCase().trim());
  const { name, symbol, symbolOnly } = normalizeStockFields(stock);

  // Exact match - highest priority (skip other checks)
  if (hasExactMatch(name, symbol, symbolOnly, normalizedQuery)) {
    return RELEVANCE_SCORES.EXACT_MATCH;
  }

  let score = 0;

  // Starts with match - high priority
  if (hasStartsWithMatch(name, symbol, symbolOnly, normalizedQuery)) {
    score += RELEVANCE_SCORES.STARTS_WITH;
  }

  // Symbol exact match - medium-high priority
  if (hasSymbolExactMatch(symbol, symbolOnly, normalizedQuery)) {
    score += RELEVANCE_SCORES.SYMBOL_EXACT_MATCH;
  }

  // Symbol starts with match - medium priority
  if (hasSymbolStartsWithMatch(symbol, symbolOnly, normalizedQuery)) {
    score += RELEVANCE_SCORES.SYMBOL_STARTS_WITH;
  }

  // Name contains - low priority
  if (name.includes(normalizedQuery)) {
    score += RELEVANCE_SCORES.NAME_CONTAINS;
  }

  // Symbol contains - low priority
  if (symbol.includes(normalizedQuery) || symbolOnly.includes(normalizedQuery)) {
    score += RELEVANCE_SCORES.SYMBOL_CONTAINS;
  }

  // Word-based match bonus
  const queryWords = normalizedQuery.split(/\s+/).filter((word) => word.length > 0);
  score += calculateWordScore(name, symbol, symbolOnly, queryWords);

  return score;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Filters stocks based on search query with Turkish character normalization
 * Matches against name, symbol, and symbol without exchange prefix
 */
export function filterStocksByQuery<T extends StockItem | WatchlistItem>(stocks: T[], query: string): T[] {
  if (!query.trim()) {
    return stocks;
  }

  const normalizedQuery = normalizeTurkishChars(query.toLowerCase().trim());
  const words = normalizedQuery.split(/\s+/).filter((word) => word.length > 0);

  if (words.length === 0) {
    return stocks;
  }

  return stocks.filter((stock) => {
    const { name, symbol, symbolOnly } = normalizeStockFields(stock);

    return words.every((word) => name.includes(word) || symbol.includes(word) || symbolOnly.includes(word));
  });
}

/**
 * Extracts search keywords from stock for filtering
 */
export function extractStockKeywords(stock: StockItem | WatchlistItem): string[] {
  const { name, symbol, symbolOnly } = normalizeStockFields(stock);
  return [name, symbol, symbolOnly];
}

/**
 * Sorts stocks by relevance to search query
 * Best matches appear first
 */
export function sortStocksByRelevance<T extends StockItem | WatchlistItem>(stocks: T[], query: string): T[] {
  if (!query.trim() || stocks.length === 0) {
    return stocks;
  }

  return [...stocks].sort((a, b) => {
    const scoreA = calculateRelevanceScore(a, query);
    const scoreB = calculateRelevanceScore(b, query);

    // Higher scored results come first
    return scoreB - scoreA;
  });
}
