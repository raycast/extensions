import { Cache, Icon, LaunchType, MenuBarExtra, launchCommand, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { loadMenuBarSymbols } from "./menubar-store";
import { changeIcon, formatChangePercent, formatMoney, formatTime } from "./utils";
import yahooFinance, { Quote } from "./yahoo-finance";

const cache = new Cache();
const QUOTES_CACHE_KEY = "menubar-quotes";

interface CachedQuotes {
  quotes: Quote[];
  updatedAt: string;
}

function loadCachedQuotes(): CachedQuotes | undefined {
  const stored = cache.get(QUOTES_CACHE_KEY);
  if (!stored) {
    return undefined;
  }
  try {
    return JSON.parse(stored) as CachedQuotes;
  } catch (e) {
    console.warn("menubar: failed to parse cached quotes", e);
    return undefined;
  }
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  // Start from the cached quotes so the menu renders immediately while fresh data loads.
  const [{ quotes, updatedAt }, setState] = useState<{ quotes: Quote[]; updatedAt: Date | null }>(() => {
    const cached = loadCachedQuotes();
    return cached ? { quotes: cached.quotes, updatedAt: new Date(cached.updatedAt) } : { quotes: [], updatedAt: null };
  });
  const [symbols, setSymbols] = useState<string[]>(() =>
    (loadCachedQuotes()?.quotes ?? []).flatMap((q) => (q.symbol ? [q.symbol] : [])),
  );

  useEffect(() => {
    const update = async () => {
      try {
        const stored = await loadMenuBarSymbols();
        setSymbols(stored);
        if (stored.length === 0) {
          setState({ quotes: [], updatedAt: null });
          cache.remove(QUOTES_CACHE_KEY);
          return;
        }
        const cached = loadCachedQuotes();
        if (cached) {
          const kept = cached.quotes.filter((q) => !!q.symbol && stored.includes(q.symbol));
          if (kept.length !== cached.quotes.length) {
            setState({ quotes: kept, updatedAt: new Date(cached.updatedAt) });
            cache.set(QUOTES_CACHE_KEY, JSON.stringify({ quotes: kept, updatedAt: cached.updatedAt }));
          }
        }
        const response = await yahooFinance.quote(stored, new AbortController().signal);
        const bySymbol = new Map(
          (response?.result ?? []).filter((q): q is Quote & { symbol: string } => !!q.symbol).map((q) => [q.symbol, q]),
        );
        const ordered = stored.flatMap((s) => bySymbol.get(s) ?? []);
        const now = new Date();
        setState({ quotes: ordered, updatedAt: now });
        cache.set(QUOTES_CACHE_KEY, JSON.stringify({ quotes: ordered, updatedAt: now.toISOString() }));
      } catch (e) {
        console.error("menubar: failed to fetch quotes", e);
      } finally {
        setIsLoading(false);
      }
    };
    update();
  }, []);

  const quotesBySymbol = new Map(
    quotes.filter((q): q is Quote & { symbol: string } => !!q.symbol).map((q) => [q.symbol, q]),
  );
  const primarySymbol = symbols.at(0);
  const primaryQuote = primarySymbol ? quotesBySymbol.get(primarySymbol) : undefined;
  const primaryInfo = primaryQuote ? yahooFinance.currentPriceInfo(primaryQuote) : undefined;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={primaryInfo ? changeIcon(primaryInfo.change) : "extension-icon.png"}
      title={
        primarySymbol
          ? primaryInfo
            ? `${primarySymbol} ${formatMoney(primaryInfo.price, primaryQuote?.currency)}`
            : primarySymbol
          : undefined
      }
      tooltip="Stock Tracker"
    >
      {symbols.length > 0 ? (
        <MenuBarExtra.Section title={updatedAt ? `Updated ${formatTime(updatedAt)}` : undefined}>
          {symbols.map((symbol) => {
            const quote = quotesBySymbol.get(symbol);
            const priceInfo = quote ? yahooFinance.currentPriceInfo(quote) : undefined;
            return (
              <MenuBarExtra.Item
                key={symbol}
                icon={changeIcon(priceInfo?.change)}
                title={symbol}
                subtitle={
                  priceInfo
                    ? `${formatMoney(priceInfo.price, quote?.currency)} (${formatChangePercent(priceInfo.changePercent)})`
                    : "—"
                }
                tooltip={quote?.shortName ?? quote?.displayName ?? "Waiting for quote data"}
                onAction={() => open(`https://finance.yahoo.com/quote/${symbol}`)}
              />
            );
          })}
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="No Stocks in Menu Bar"
            subtitle="Add stocks from the View Stocks command"
            icon={Icon.Info}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Stock Tracker"
          icon={Icon.LineChart}
          onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
