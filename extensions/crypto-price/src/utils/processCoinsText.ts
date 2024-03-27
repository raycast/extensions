import { uniq, compact, pull } from "lodash";
import { COINS } from "#/constants";

export function processCoinsText(coinsText: string): { symbols: string[]; primaryCount: number } {
  const parts = `${coinsText}`.split(/ +/);
  const rawSymbols = parts.map((part) => {
    if (part === "|") {
      return part;
    }
    const symbol = part.toUpperCase();
    if (COINS[symbol]) {
      return symbol;
    }
  });
  const cleanedSymbols = uniq(compact(rawSymbols));
  const primaryCount = Math.max(cleanedSymbols.indexOf("|"), 1);
  let symbols = pull(cleanedSymbols, "|");
  if (symbols.length === 0) {
    symbols = Object.keys(COINS);
  }
  return {
    symbols,
    primaryCount,
  };
}
