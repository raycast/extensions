// Favorites: the instruments a person pinned, in their order, shared by every
// command (Search Symbol, the menu bar and the AI tools) through LocalStorage.
import { LocalStorage } from "@raycast/api";
import type { Instrument, Kind } from "./symbols";
import { MARKET_LABELS } from "./symbols";

const KEY = "favorites-v1";
/** Enough to fill a menu without making the menu bar fetch for a minute. */
export const FAVORITES_LIMIT = 50;

/** A favorite keeps the instrument as it was pinned, so the menu bar can name it without the catalog. */
export type Favorite = Instrument;

const KINDS = new Set<Kind>(["equity", "etf", "index", "crypto"]);
const MARKETS = new Set(Object.keys(MARKET_LABELS));

function validFavorite(value: unknown): value is Favorite {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.symbol === "string" &&
    entry.symbol.length > 0 &&
    typeof entry.name === "string" &&
    typeof entry.market === "string" &&
    MARKETS.has(entry.market) &&
    typeof entry.kind === "string" &&
    KINDS.has(entry.kind as Kind) &&
    (entry.exchange === null || typeof entry.exchange === "string")
  );
}

export async function loadFavorites(): Promise<Favorite[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.filter((entry): entry is Favorite => {
      if (!validFavorite(entry) || seen.has(entry.symbol)) return false;
      seen.add(entry.symbol);
      return true;
    });
  } catch {
    return [];
  }
}

export async function saveFavorites(favorites: Favorite[]): Promise<Favorite[]> {
  const kept = favorites.slice(0, FAVORITES_LIMIT).map(({ symbol, market, kind, name, exchange }) => ({
    symbol,
    market,
    kind,
    name,
    exchange,
  }));
  await LocalStorage.setItem(KEY, JSON.stringify(kept));
  return kept;
}

export class FavoritesFullError extends Error {
  constructor() {
    super(`Pulse keeps up to ${FAVORITES_LIMIT} favorites. Remove one to add another.`);
  }
}

let pending: Promise<unknown> = Promise.resolve();

/** Runs one read-and-save after the ones before it, so quick changes do not overwrite each other. */
function serialized<T>(change: () => Promise<T>): Promise<T> {
  const run = pending.then(change, change);
  pending = run.catch(() => undefined);
  return run;
}

/** Pins instruments at the end of the list; ones already pinned keep their place. */
export function addFavorites(instruments: Instrument[]): Promise<{ added: Favorite[]; favorites: Favorite[] }> {
  return serialized(async () => {
    const current = await loadFavorites();
    const pinned = new Set(current.map((favorite) => favorite.symbol));
    const added = instruments.filter((instrument) => {
      if (pinned.has(instrument.symbol)) return false;
      pinned.add(instrument.symbol);
      return true;
    });
    if (current.length + added.length > FAVORITES_LIMIT) throw new FavoritesFullError();
    const favorites = added.length ? await saveFavorites([...current, ...added]) : current;
    return { added, favorites };
  });
}

export function removeFavorites(symbols: string[]): Promise<{ removed: Favorite[]; favorites: Favorite[] }> {
  return serialized(async () => {
    const current = await loadFavorites();
    const unpin = new Set(symbols.map((symbol) => symbol.toUpperCase()));
    const removed = current.filter((favorite) => unpin.has(favorite.symbol.toUpperCase()));
    const favorites = removed.length
      ? await saveFavorites(current.filter((favorite) => !removed.includes(favorite)))
      : current;
    return { removed, favorites };
  });
}

/** Moves a favorite one place up (-1) or down (+1); the first favorite leads the menu bar. */
export function moveFavorite(symbol: string, offset: -1 | 1): Promise<Favorite[]> {
  return serialized(async () => {
    const current = await loadFavorites();
    const from = current.findIndex((favorite) => favorite.symbol === symbol);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= current.length) return current;
    const next = [...current];
    [next[from], next[to]] = [next[to], next[from]];
    return saveFavorites(next);
  });
}
