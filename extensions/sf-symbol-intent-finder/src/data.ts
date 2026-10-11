import { loadDataset } from "./catalog";

export type { Dataset, OSVersions, SFSymbol } from "./catalog";
import type { SFSymbol } from "./catalog";

// Names, search terms, and availability come from the user's own macOS at
// runtime (bundled data.json is the fallback), so the catalog stays current
// without extension updates. See catalog.ts.
const data = loadDataset();

export const SYMBOLS = data.symbols;

/** Fast lookup from a symbol name to its record, used to validate AI suggestions. */
const BY_NAME = new Map<string, SFSymbol>(SYMBOLS.map((s) => [s.name, s]));

export function getSymbol(name: string): SFSymbol | undefined {
  return BY_NAME.get(name);
}

/** Remote, pre-rendered, tintable PNG for a symbol — used until the local render exists. */
export function imageURL(name: string): string {
  return `https://raw.githubusercontent.com/ndckj/sf-symbols/main/images/100/${name}.png`;
}

/** iOS availability string, e.g. "iOS 17.0", or undefined when unknown. */
export function iosAvailability(symbol: SFSymbol): string | undefined {
  const ios = data.versions[String(symbol.availableFrom)]?.iOS;
  return ios ? `iOS ${ios}` : undefined;
}

/**
 * Instant local search. Ranks exact and prefix name matches first, then
 * substring name matches, then keyword/category matches. Returns all symbols
 * for an empty query so the grid is never blank.
 */
export function searchSymbols(query: string): SFSymbol[] {
  const q = query.trim().toLowerCase();
  if (!q) return SYMBOLS;

  const scored: { symbol: SFSymbol; score: number }[] = [];
  for (const symbol of SYMBOLS) {
    const name = symbol.name.toLowerCase();
    let score = Infinity;

    if (name === q) score = 0;
    else if (name.startsWith(q)) score = 1;
    else if (name.includes(q)) score = 2;
    else if (symbol.searchTerms.some((t) => t.toLowerCase() === q)) score = 3;
    else if (symbol.searchTerms.some((t) => t.toLowerCase().includes(q))) score = 4;
    else if (symbol.categories.some((c) => c.toLowerCase().includes(q))) score = 5;

    if (score !== Infinity) scored.push({ symbol, score });
  }

  scored.sort((a, b) => a.score - b.score || a.symbol.name.length - b.symbol.name.length);
  return scored.map((s) => s.symbol);
}
