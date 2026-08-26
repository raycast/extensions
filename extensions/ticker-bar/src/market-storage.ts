import { LocalStorage } from "@raycast/api";
import { normalizeAssetId, parseWatchlist } from "./market-ids";
import { withMarketStateLock } from "./market-lock";
import { LogoDisplay, MenuBarStyle, Quote, QuoteStatus } from "./market-types";

const WATCHLIST_KEY = "watchlist.v1";
const QUOTES_KEY = "quotes.v1";
const QUOTE_STATUS_KEY = "quote-status.v1";
const PRIMARY_ASSET_KEY = "primary-asset.v1";
const MENU_BAR_STYLE_KEY = "menu-bar-style.v1";
const LOGO_DISPLAY_KEY = "logo-display.v1";

export const DEFAULT_WATCHLIST = ["stock:SPY", "crypto:bitcoin"];
export const MAX_WATCHLIST_SIZE = 50;

export async function getWatchlist(): Promise<string[]> {
  const stored = await LocalStorage.getItem<string>(WATCHLIST_KEY);
  if (stored) {
    const parsed = parseWatchlist(stored);
    const ids = reconcileWatchlist(parsed);
    if (ids.join("\n") !== parsed.join("\n")) {
      await LocalStorage.setItem(WATCHLIST_KEY, ids.join("\n"));
    }
    return ids;
  }
  return DEFAULT_WATCHLIST;
}

export async function setWatchlist(ids: string[]) {
  const normalized = [
    ...new Set(
      ids.map((id) => normalizeAssetId(id)).filter(Boolean) as string[],
    ),
  ];
  if (normalized.length > MAX_WATCHLIST_SIZE) {
    throw new Error(
      `Ticker Bar supports up to ${MAX_WATCHLIST_SIZE} watchlist items`,
    );
  }
  await withMarketStateLock(async () => {
    await LocalStorage.setItem(WATCHLIST_KEY, normalized.join("\n"));

    const primary = await getPrimaryAssetId();
    if (primary && !normalized.includes(primary)) {
      if (normalized[0]) {
        await LocalStorage.setItem(PRIMARY_ASSET_KEY, normalized[0]);
      } else {
        await LocalStorage.removeItem(PRIMARY_ASSET_KEY);
      }
    }

    const cached = await getCachedQuotes();
    const prunedQuotes = Object.fromEntries(
      normalized.flatMap((id) => (cached[id] ? [[id, cached[id]]] : [])),
    );
    if (Object.keys(prunedQuotes).length !== Object.keys(cached).length) {
      await saveCachedQuotes(prunedQuotes);
    }

    const statuses = await getQuoteStatuses();
    const prunedStatuses = Object.fromEntries(
      normalized.flatMap((id) => (statuses[id] ? [[id, statuses[id]]] : [])),
    );
    if (Object.keys(prunedStatuses).length !== Object.keys(statuses).length) {
      await saveQuoteStatuses(prunedStatuses);
    }
  });
}

export async function addToWatchlist(id: string): Promise<string | undefined> {
  const normalized = normalizeAssetId(id);
  if (!normalized) return undefined;
  const ids = await getWatchlist();
  if (!ids.includes(normalized) && ids.length >= MAX_WATCHLIST_SIZE) {
    throw new Error(`Watchlist limit reached (${MAX_WATCHLIST_SIZE} items)`);
  }
  if (!ids.includes(normalized)) await setWatchlist([...ids, normalized]);
  return normalized;
}

export async function removeFromWatchlist(id: string) {
  const normalized = normalizeAssetId(id);
  if (!normalized) return;
  const ids = await getWatchlist();
  await setWatchlist(ids.filter((entry) => entry !== normalized));
}

export async function moveWatchlistItem(id: string, direction: "up" | "down") {
  const normalized = normalizeAssetId(id);
  if (!normalized) return;
  const ids = await getWatchlist();
  const index = ids.indexOf(normalized);
  if (index === -1) return;
  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= ids.length) return;
  const next = [...ids];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  await setWatchlist(next);
}

export async function resetWatchlistToDefaults() {
  await setWatchlist(DEFAULT_WATCHLIST);
  await setPrimaryAssetId(DEFAULT_WATCHLIST[0]);
}

export async function getPrimaryAssetId(fallback?: string) {
  const stored = await LocalStorage.getItem<string>(PRIMARY_ASSET_KEY);
  const normalizedStored = stored ? normalizeAssetId(stored) : undefined;
  if (normalizedStored) return normalizedStored;

  const normalizedFallback = fallback ? normalizeAssetId(fallback) : undefined;
  if (normalizedFallback) return normalizedFallback;

  const [first] = await getWatchlist();
  return first;
}

export async function setPrimaryAssetId(id: string) {
  const normalized = normalizeAssetId(id);
  if (!normalized) return;
  await addToWatchlist(normalized);
  await LocalStorage.setItem(PRIMARY_ASSET_KEY, normalized);
}

export async function getMenuBarStyle(): Promise<MenuBarStyle> {
  const stored = await LocalStorage.getItem<string>(MENU_BAR_STYLE_KEY);
  return stored === "primary-change" ? stored : "primary";
}

export async function setMenuBarStyle(style: MenuBarStyle) {
  await LocalStorage.setItem(MENU_BAR_STYLE_KEY, style);
}

export async function getLogoDisplay(): Promise<LogoDisplay> {
  const stored = await LocalStorage.getItem<string>(LOGO_DISPLAY_KEY);
  // Earlier development builds offered dropdown-logo modes. A Raycast menu
  // row has one icon slot, so those modes displaced the colored direction
  // chevron. Migrate every enabled value to the non-destructive menu-bar mode.
  return stored === "off" ? "off" : "menu-bar";
}

export async function setLogoDisplay(display: LogoDisplay) {
  await LocalStorage.setItem(LOGO_DISPLAY_KEY, display);
}

export async function getCachedQuotes(): Promise<Record<string, Quote>> {
  const stored = await LocalStorage.getItem<string>(QUOTES_KEY);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, Quote] =>
        isQuote(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

export async function saveCachedQuotes(quotes: Record<string, Quote>) {
  await LocalStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}

export async function getQuoteStatuses(): Promise<Record<string, QuoteStatus>> {
  const stored = await LocalStorage.getItem<string>(QUOTE_STATUS_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored) as Record<string, QuoteStatus>;
  } catch {
    return {};
  }
}

export async function saveQuoteStatuses(statuses: Record<string, QuoteStatus>) {
  await LocalStorage.setItem(QUOTE_STATUS_KEY, JSON.stringify(statuses));
}

function reconcileWatchlist(ids: string[]) {
  return [...new Set(ids)];
}

function isQuote(value: unknown): value is Quote {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const quote = value as Partial<Quote>;
  return (
    typeof quote.id === "string" &&
    typeof quote.kind === "string" &&
    typeof quote.symbol === "string" &&
    typeof quote.name === "string" &&
    typeof quote.price === "number" &&
    Number.isFinite(quote.price) &&
    typeof quote.priceLabel === "string" &&
    typeof quote.provider === "string" &&
    typeof quote.asOf === "string"
  );
}
