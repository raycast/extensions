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

  useEffect(() => {
    const update = async () => {
      try {
        const symbols = await loadMenuBarSymbols();
        if (symbols.length === 0) {
          setState({ quotes: [], updatedAt: null });
          cache.remove(QUOTES_CACHE_KEY);
          return;
        }
        const cached = loadCachedQuotes();
        if (cached) {
          const kept = cached.quotes.filter((q) => !!q.symbol && symbols.includes(q.symbol));
          if (kept.length !== cached.quotes.length) {
            setState({ quotes: kept, updatedAt: new Date(cached.updatedAt) });
            cache.set(QUOTES_CACHE_KEY, JSON.stringify({ quotes: kept, updatedAt: cached.updatedAt }));
          }
        }
        const response = await yahooFinance.quote(symbols, new AbortController().signal);
        const bySymbol = new Map(
          (response?.result ?? []).filter((q): q is Quote & { symbol: string } => !!q.symbol).map((q) => [q.symbol, q]),
        );
        const ordered = symbols.flatMap((s) => bySymbol.get(s) ?? []);
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

  const primary = quotes.at(0);
  const primaryInfo = primary ? yahooFinance.currentPriceInfo(primary) : undefined;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={primaryInfo ? changeIcon(primaryInfo.change) : "extension-icon.png"}
      title={primary ? `${primary.symbol} ${formatMoney(primaryInfo?.price, primary.currency)}` : undefined}
      tooltip="Stock Tracker"
    >
      {quotes.length > 0 ? (
        <MenuBarExtra.Section title={updatedAt ? `Updated ${formatTime(updatedAt)}` : undefined}>
          {quotes.map((quote) => {
            const priceInfo = yahooFinance.currentPriceInfo(quote);
            return (
              <MenuBarExtra.Item
                key={quote.symbol}
                icon={changeIcon(priceInfo.change)}
                title={quote.symbol!}
                subtitle={`${formatMoney(priceInfo.price, quote.currency)} (${formatChangePercent(priceInfo.changePercent)})`}
                tooltip={quote.shortName ?? quote.displayName}
                onAction={() => open(`https://finance.yahoo.com/quote/${quote.symbol}`)}
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
