import { Action, Tool } from "@raycast/api";
import { loadFavorites, removeFavorites } from "../lib/favorites";
import { refreshMenuBar } from "../lib/menu-bar";
import { normalizeTypedSymbol } from "../lib/symbols";

type Input = {
  /** Symbols to remove, exactly as get-favorites lists them, like AAPL, 0700.HK or BTC/USDT. */
  symbols: string[];
};

const wanted = (input: Input) =>
  input.symbols.map((symbol) => normalizeTypedSymbol(symbol.replace(/\s+/g, "")) ?? symbol.trim().toUpperCase());

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const symbols = new Set(wanted(input));
  const matching = (await loadFavorites()).filter((favorite) => symbols.has(favorite.symbol.toUpperCase()));
  if (matching.length === 0) return undefined;
  return {
    style: Action.Style.Destructive,
    message: `Remove ${matching.length === 1 ? "this symbol" : `these ${matching.length} symbols`} from your Pulse favorites?`,
    info: matching.map((favorite) => ({
      name: favorite.symbol,
      value: favorite.name === favorite.symbol ? undefined : favorite.name,
    })),
  };
};

/** Removes symbols from the person's Pulse favorites. */
export default async function tool(input: Input) {
  const symbols = wanted(input);
  const { removed, favorites } = await removeFavorites(symbols);
  if (removed.length) refreshMenuBar();
  const gone = new Set(removed.map((favorite) => favorite.symbol.toUpperCase()));
  return {
    removed: removed.map((favorite) => favorite.symbol),
    notFavorites: symbols.filter((symbol) => !gone.has(symbol.toUpperCase())),
    remaining: favorites.map((favorite) => favorite.symbol),
  };
}
