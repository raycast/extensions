import { uniq, compact, pull } from "lodash";

// Coins shown when the preference is left empty or has no valid symbols. This mirrors the
// package.json `coins` default. It's an explicit list (not `Object.keys(COINS)`) because
// COINS is a metadata table for sources, not an allowlist — any symbol a source supports works.
const DEFAULT_SYMBOLS = ["BTC", "ETH", "BNB", "SOL", "XRP"];

export function processCoinsText(coinsText: string): { symbols: string[]; primaryCount: number } {
  const parts = `${coinsText}`.split(/ +/);
  const rawSymbols = parts.map((part) => {
    if (part === "|") {
      return part;
    }
    const symbol = part.toUpperCase();
    if (/^[A-Z0-9]+$/.test(symbol)) {
      return symbol;
    }
  });
  const cleanedSymbols = uniq(compact(rawSymbols));
  const primaryCount = Math.max(cleanedSymbols.indexOf("|"), 1);
  let symbols = pull(cleanedSymbols, "|");
  if (symbols.length === 0) {
    symbols = [...DEFAULT_SYMBOLS];
  }
  return {
    symbols,
    primaryCount,
  };
}
