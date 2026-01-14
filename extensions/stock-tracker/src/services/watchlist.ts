import { LocalStorage } from "@raycast/api";
import { Watchlist, WatchlistItem, StockItem } from "../types";
import { STORAGE_KEYS } from "../constants";

/**
 * Ensures single watchlist is automatically pinned
 */
async function ensureSingleWatchlistPinned(watchlists: Watchlist[]): Promise<void> {
  if (watchlists.length === 1 && !watchlists[0].pinned) {
    watchlists[0].pinned = true;
    await LocalStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify(watchlists));
  }
}

/**
 * Sorts watchlists with pinned ones first
 */
function sortWatchlistsByPin(watchlists: Watchlist[]): Watchlist[] {
  return [...watchlists].sort((a, b) => {
    const aPinned = a.pinned ?? false;
    const bPinned = b.pinned ?? false;
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });
}

export async function getAllWatchlists(): Promise<Watchlist[]> {
  const data = await LocalStorage.getItem(STORAGE_KEYS.WATCHLISTS);
  if (!data) return [];
  const watchlists = JSON.parse(data as string) as Watchlist[];

  await ensureSingleWatchlistPinned(watchlists);
  return sortWatchlistsByPin(watchlists);
}

export async function getWatchlist(id: string): Promise<Watchlist | null> {
  const watchlists = await getAllWatchlists();
  return watchlists.find((w) => w.id === id) ?? null;
}

export async function createWatchlist(name: string): Promise<Watchlist> {
  const watchlists = await getAllWatchlists();
  const newWatchlist: Watchlist = {
    id: Date.now().toString(),
    name,
    stocks: [],
    createdAt: new Date().toISOString(),
    pinned: watchlists.length === 0, // Auto-pin if first watchlist
  };
  watchlists.push(newWatchlist);
  await LocalStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify(watchlists));
  return newWatchlist;
}

export async function deleteWatchlist(id: string): Promise<void> {
  const watchlists = await getAllWatchlists();
  const filtered = watchlists.filter((w) => w.id !== id);

  await ensureSingleWatchlistPinned(filtered);
  await LocalStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify(filtered));
}

export async function updateWatchlistName(id: string, name: string): Promise<void> {
  const watchlists = await getAllWatchlists();
  const index = watchlists.findIndex((w) => w.id === id);
  if (index !== -1) {
    watchlists[index].name = name;
    await LocalStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify(watchlists));
  }
}

export async function addStockToWatchlist(watchlistId: string, stock: StockItem): Promise<void> {
  const watchlists = await getAllWatchlists();
  const watchlist = watchlists.find((w) => w.id === watchlistId);
  if (!watchlist) return;

  const exists = watchlist.stocks.some((s) => s.symbol === stock.symbol);
  if (exists) return;

  const watchlistItem: WatchlistItem = {
    ...stock,
    addedAt: new Date().toISOString(),
  };

  watchlist.stocks.push(watchlistItem);
  await LocalStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify(watchlists));

  // Son kullanılan watchlist'i kaydet
  await LocalStorage.setItem(STORAGE_KEYS.LAST_WATCHLIST_ID, watchlistId);
}

export async function removeStockFromWatchlist(watchlistId: string, symbol: string): Promise<void> {
  const watchlists = await getAllWatchlists();
  const watchlist = watchlists.find((w) => w.id === watchlistId);
  if (!watchlist) return;

  watchlist.stocks = watchlist.stocks.filter((s) => s.symbol !== symbol);
  await LocalStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify(watchlists));
}

export async function isStockInWatchlist(watchlistId: string, symbol: string): Promise<boolean> {
  const watchlist = await getWatchlist(watchlistId);
  if (!watchlist) return false;
  return watchlist.stocks.some((s) => s.symbol === symbol);
}

export async function getLastUsedWatchlistId(): Promise<string | null> {
  const lastId = await LocalStorage.getItem(STORAGE_KEYS.LAST_WATCHLIST_ID);
  return lastId ? (lastId as string) : null;
}

export async function togglePinWatchlist(id: string): Promise<void> {
  const watchlists = await getAllWatchlists();
  const index = watchlists.findIndex((w) => w.id === id);
  if (index === -1) return;

  const targetWatchlist = watchlists[index];
  const isCurrentlyPinned = targetWatchlist.pinned ?? false;

  // Cannot unpin if only one watchlist exists (auto-pinned)
  if (watchlists.length === 1) {
    return;
  }

  if (!isCurrentlyPinned) {
    // Pin this watchlist and unpin all others
    watchlists.forEach((w) => {
      w.pinned = w.id === id;
    });
  } else {
    // Unpin this watchlist
    targetWatchlist.pinned = false;
  }

  await LocalStorage.setItem(STORAGE_KEYS.WATCHLISTS, JSON.stringify(watchlists));
}
