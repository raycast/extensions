import { Cache } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { t212ErrorInfo } from "../components/error-view";
import { historyCacheKey } from "../lib/cache";
import {
  createT212Client,
  isRateLimited,
  isRejectedCursorError,
  rateLimitWaitMs,
  type HistoryPath,
} from "../lib/t212/client";
import { syncHistory } from "../lib/t212/history-sync";
import type { DividendItem, HistoricalOrder, TransactionItem } from "../lib/t212/types";
import { getPrefs } from "./preferences";

export type HistoryKind = "dividends" | "orders" | "transactions";

export type ItemFor<K extends HistoryKind> = {
  dividends: DividendItem;
  orders: HistoricalOrder;
  transactions: TransactionItem;
}[K];

const SOURCES: { [K in HistoryKind]: { path: HistoryPath; keyOf: (item: ItemFor<K>) => string } } = {
  dividends: { path: "/api/v0/equity/history/dividends", keyOf: (d) => d.reference },
  orders: { path: "/api/v0/equity/history/orders", keyOf: (o) => String(o.order.id) },
  transactions: { path: "/api/v0/equity/history/transactions", keyOf: (t) => t.reference },
};

// Years of daily interest rows add up; the default 10 MB would start evicting.
const cache = new Cache({ namespace: "history", capacity: 50 * 1024 * 1024 });

interface Stored<T> {
  items: T[];
  /** Where an interrupted first load stopped; null once the whole history is cached. */
  resumeFrom: string | null;
}

function readStored<T>(key: string): Stored<T> {
  try {
    const raw = cache.get(key);
    const items: unknown = raw ? JSON.parse(raw) : [];
    return { items: Array.isArray(items) ? (items as T[]) : [], resumeFrom: cache.get(`${key}:resume`) ?? null };
  } catch {
    return { items: [], resumeFrom: null };
  }
}

function writeStored<T>(key: string, stored: Stored<T>) {
  cache.set(key, JSON.stringify(stored.items));
  if (stored.resumeFrom) cache.set(`${key}:resume`, stored.resumeFrom);
  else cache.remove(`${key}:resume`);
}

/**
 * Cached history of one kind, synced with Trading 212 whenever `execute` turns true. The list fills
 * in page by page on a first load. A sync keeps running (and caching) when `execute` turns false,
 * and only one sync per kind runs at a time.
 */
export function useHistory<K extends HistoryKind>(
  kind: K,
  { execute }: { execute: boolean },
): { items: ItemFor<K>[]; isLoading: boolean; error: Error | undefined; revalidate: () => void } {
  const { apiKey, apiSecret, environment } = getPrefs();
  const cacheKey = historyCacheKey(environment, apiKey, kind);

  // Read synchronously so switching to this kind shows its cached items on the first frame.
  const [initial] = useState(() => readStored<ItemFor<K>>(cacheKey));
  const stored = useRef(initial);
  const [items, setItems] = useState(initial.items);
  const inFlight = useRef<Promise<void> | null>(null);
  const visible = useRef(execute);
  visible.current = execute;

  async function sync(key: string): Promise<void> {
    const start = stored.current;
    const { path, keyOf } = SOURCES[kind];
    const client = createT212Client({ apiKey, apiSecret, environment });
    await syncHistory((next) => client.getHistoryPage<ItemFor<K>>(path, next), start.items, keyOf, {
      resumeFrom: start.resumeFrom,
      isRejectedCursor: isRejectedCursorError,
      rateLimitWaitMs,
      onProgress: (itemsSoFar, resumeFrom) => {
        stored.current = { items: itemsSoFar, resumeFrom };
        writeStored(key, stored.current);
        setItems(itemsSoFar);
      },
    });
  }

  const { isLoading, error, revalidate } = usePromise(
    (key: string) => {
      // A refresh while a sync runs joins it instead of starting a second one (20 requests a minute).
      inFlight.current ??= sync(key).finally(() => {
        inFlight.current = null;
      });
      return inFlight.current;
    },
    [cacheKey],
    {
      execute,
      onError: (e) => {
        // Without items the command shows the error view instead; with them, keep the list and toast
        // (except for a rate limit: the cached list is still right, and the next sync catches up).
        if (visible.current && stored.current.items.length > 0 && !isRateLimited(e)) {
          showFailureToast(e, { title: t212ErrorInfo(e).title });
        }
      },
    },
  );

  return { items, isLoading: execute && isLoading, error, revalidate };
}
