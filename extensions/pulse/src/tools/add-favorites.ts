import { Tool } from "@raycast/api";
import { FAVORITES_LIMIT, addFavorites, loadFavorites } from "../lib/favorites";
import { refreshMenuBar } from "../lib/menu-bar";
import { fetchRows } from "../lib/quotes";
import { Instrument } from "../lib/symbols";
import { describeInstrument, resolveSymbols } from "../lib/tool-support";

type Input = {
  /**
   * Symbols to add to the person's favorites, exactly as the search-symbols tool returns them,
   * like AAPL, 0700.HK, 2330.TW, ^N225 or BTC/USDT.
   */
  symbols: string[];
};

async function plan(input: Input) {
  const resolved = await resolveSymbols([...new Set(input.symbols.map((symbol) => symbol.trim()).filter(Boolean))]);
  const pinned = new Set((await loadFavorites()).map((favorite) => favorite.symbol));
  const instruments = [...resolved.values()].filter((item): item is Instrument => item !== null);
  return {
    toAdd: instruments.filter((instrument) => !pinned.has(instrument.symbol)),
    already: instruments.filter((instrument) => pinned.has(instrument.symbol)),
    unknown: [...resolved].filter(([, instrument]) => instrument === null).map(([symbol]) => symbol),
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const { toAdd } = await plan(input);
  if (toAdd.length === 0) return undefined;
  return {
    message: `Add ${toAdd.length === 1 ? "this symbol" : `these ${toAdd.length} symbols`} to your Pulse favorites?`,
    info: toAdd.map((instrument) => ({
      name: instrument.symbol,
      value: instrument.name === instrument.symbol ? (instrument.exchange ?? undefined) : instrument.name,
    })),
  };
};

/** Adds symbols to the end of the person's Pulse favorites, which the menu bar and Search Symbol show first. */
export default async function tool(input: Input) {
  const { toAdd, already, unknown } = await plan(input);
  // A ticker the catalog does not list is kept only when its source can price it.
  const unlisted = toAdd.filter((instrument) => instrument.name === instrument.symbol && !instrument.exchange);
  let priced: Set<string> = new Set(toAdd.map((instrument) => instrument.symbol));
  if (unlisted.length) {
    const rows = await fetchRows(unlisted.map((instrument) => instrument.symbol)).catch(() => null);
    if (rows) {
      priced = new Set(
        toAdd
          .filter((instrument) => !unlisted.includes(instrument) || rows.quotes[instrument.symbol])
          .map((instrument) => instrument.symbol),
      );
    }
  }
  const unpriced = toAdd.filter((instrument) => !priced.has(instrument.symbol)).map((instrument) => instrument.symbol);
  const { added, favorites } = await addFavorites(toAdd.filter((instrument) => priced.has(instrument.symbol)));
  if (added.length) refreshMenuBar();
  return {
    added: added.map(describeInstrument),
    alreadyFavorites: already.map((instrument) => instrument.symbol),
    notFound: [...unknown, ...unpriced],
    favoriteCount: favorites.length,
    limit: FAVORITES_LIMIT,
  };
}
