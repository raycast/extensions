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
  // A ticker the catalog does not list is kept only once its source has priced it.
  const unlisted = toAdd
    .filter((instrument) => instrument.name === instrument.symbol && !instrument.exchange)
    .map((instrument) => instrument.symbol);
  let unpriced: string[] = [];
  let unchecked: string[] = [];
  if (unlisted.length) {
    try {
      const rows = await fetchRows(unlisted);
      const missing = unlisted.filter((symbol) => !rows.quotes[symbol]);
      // With a source down, a missing price says nothing about the ticker.
      if (rows.failed.length) unchecked = missing;
      else unpriced = missing;
    } catch {
      unchecked = unlisted;
    }
  }
  const skipped = new Set([...unpriced, ...unchecked]);
  const { added, favorites } = await addFavorites(toAdd.filter((instrument) => !skipped.has(instrument.symbol)));
  if (added.length) refreshMenuBar();
  return {
    added: added.map(describeInstrument),
    alreadyFavorites: already.map((instrument) => instrument.symbol),
    notFound: [...unknown, ...unpriced],
    notChecked: unchecked,
    favoriteCount: favorites.length,
    limit: FAVORITES_LIMIT,
    note: unchecked.length
      ? `Yahoo Finance did not answer, so ${unchecked.join(", ")} could not be checked and ${unchecked.length === 1 ? "was" : "were"} not added. Try again later.`
      : undefined,
  };
}
