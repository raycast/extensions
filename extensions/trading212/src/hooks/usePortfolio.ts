import { Cache, LocalStorage } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useRef } from "react";
import { t212ErrorInfo } from "../components/error-view";
import { apiKeyHash, portfolioSnapshotKey, readSnapshot, writeSnapshot } from "../lib/cache";
import { buildPortfolioView, type DayQuote, type PortfolioView } from "../lib/portfolio";
import { createT212Client, isRateLimited } from "../lib/t212/client";
import type { AccountSummary, Environment, Position } from "../lib/t212/types";
import { fetchChart, probeYahooCurrency } from "../lib/yahoo/chart";
import { collectDayQuotes, type PositionQuote } from "../lib/yahoo/day-quotes";
import { resolveYahooSymbol, searchYahooByIsin } from "../lib/yahoo/symbol";
import { getPrefs } from "./preferences";

const YAHOO_CONCURRENCY = 4;
/** Overall wait for Yahoo; quotes that haven't arrived by then are left out so Trading 212 data shows. */
const YAHOO_BUDGET_MS = 12_000;

interface PortfolioData {
  summary: AccountSummary;
  positions: Position[];
  symbols: Record<string, string | null>;
  quotes: Record<string, DayQuote>;
  updatedAt: number;
}

async function yahooForPosition(position: Position): Promise<PositionQuote> {
  const symbol = await resolveYahooSymbol(position.instrument, {
    search: (isin) => searchYahooByIsin(isin),
    probe: (symbol) => probeYahooCurrency(symbol),
    store: LocalStorage,
  }).catch(() => null);
  if (!symbol) return { symbol: null };
  try {
    // "Today" comes from the 1D series: its previous close is yesterday's close.
    const { price, previousClose, marketTime } = await fetchChart(symbol, "1D");
    return { symbol, quote: { price, previousClose, marketTime } };
  } catch {
    return { symbol };
  }
}

// `keyHash` only scopes the cache to the account (useCachedPromise keys its cache by the arguments).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function loadPortfolio(environment: Environment, keyHash: string): Promise<PortfolioData> {
  const { apiKey, apiSecret } = getPrefs();
  const client = createT212Client({ apiKey, apiSecret, environment });
  // Sequential on purpose: /account/summary is limited to 1 per 5 s and /positions to 1 per 1 s.
  const summary = await client.getAccountSummary();
  const positions = await client.getPositions();

  const { symbols, quotes } = await collectDayQuotes(positions, yahooForPosition, {
    concurrency: YAHOO_CONCURRENCY,
    budgetMs: YAHOO_BUDGET_MS,
  });
  return { summary, positions, symbols, quotes, updatedAt: Date.now() };
}

const snapshots = new Cache({ namespace: "portfolio" });

export function usePortfolio(opts: { toastOnError?: boolean } = {}): {
  view: PortfolioView | undefined;
  symbols: Record<string, string | null>;
  isLoading: boolean;
  error: Error | undefined;
  revalidate: () => void;
  updatedAt: number | undefined;
} {
  const { toastOnError = true } = opts;
  const { apiKey, environment } = getPrefs();
  const keyHash = apiKeyHash(apiKey);
  const snapshotKey = portfolioSnapshotKey(environment, keyHash);
  // Last data saved by any command (Portfolio, menu bar, History), shown until the fetch finishes.
  const snapshot = useMemo(() => readSnapshot<PortfolioData>(snapshots, snapshotKey), [snapshotKey]);
  const hasData = useRef(false);
  const { data, isLoading, error, revalidate } = useCachedPromise(loadPortfolio, [environment, keyHash], {
    initialData: snapshot,
    onData: (fresh) => writeSnapshot(snapshots, snapshotKey, fresh),
    // Without cached data the command shows the error view instead. With it, keep the data and toast,
    // unless toasts are off (menu bar, History) or Trading 212 is only rate-limiting.
    onError: (err) => {
      if (toastOnError && hasData.current && !isRateLimited(err)) {
        showFailureToast(err, { title: t212ErrorInfo(err).title });
      }
    },
  });
  useEffect(() => {
    hasData.current = data !== undefined;
  }, [data]);

  const view = useMemo(
    () => (data ? buildPortfolioView(data.summary, data.positions, data.quotes) : undefined),
    [data],
  );
  return { view, symbols: data?.symbols ?? {}, isLoading, error, revalidate, updatedAt: data?.updatedAt };
}
