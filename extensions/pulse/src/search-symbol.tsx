import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
  Toast,
  environment,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { loadIndex, store, typedInstrument } from "./lib/load";
import { chartMarkdown, chartSvg } from "./lib/chart";
import { SESSION_LABELS, formatChange, formatDelay, formatNumber, formatPrice, formatTimestamp } from "./lib/format";
import { Quote, RowQuote, fetchBinanceRows, fetchQuote, fetchSparkQuotes } from "./lib/quotes";
import { readerLanguage } from "./lib/search";
import {
  INDICES,
  Instrument,
  Language,
  MARKET_CURRENCIES,
  MARKET_FILTERS,
  MARKET_LABELS,
  PULSE_FOR_MAC_URL,
  isCryptoPair,
  quotePageUrl,
} from "./lib/symbols";

const SYSTEM_LOCALE = Intl.DateTimeFormat().resolvedOptions().locale;
const RECENT_LIMIT = 12;

// Most of Asia shows gains in red; crypto exchanges show them in green everywhere.
function redForGains(instrument: Instrument): boolean {
  const { priceColors } = getPreferenceValues<Preferences.SearchSymbol>();
  if (priceColors === "red-up") return true;
  if (priceColors === "red-up-stocks") return instrument.kind !== "crypto";
  return false;
}

const changeColor = (value: number | null | undefined, instrument: Instrument) => {
  if (value === null || value === undefined) return Color.SecondaryText;
  const gain = value >= 0;
  return gain !== redForGains(instrument) ? Color.Green : Color.Red;
};

function icon(instrument: Instrument): Image.ImageLike {
  switch (instrument.kind) {
    case "crypto":
      return { source: Icon.Coins, tintColor: Color.Orange };
    case "index":
      return { source: Icon.LineChart, tintColor: Color.Blue };
    case "etf":
      return { source: Icon.Layers, tintColor: Color.Purple };
    default:
      return { source: Icon.Building, tintColor: Color.SecondaryText };
  }
}

function marketTag(instrument: Instrument): string {
  if (instrument.kind === "crypto") return "Binance";
  if (instrument.kind === "index") return "Index";
  return instrument.exchange ?? MARKET_LABELS[instrument.market];
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.SearchSymbol>();
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("all");
  const [showingDetail, setShowingDetail] = useCachedState("showing-detail", true);
  const [recent, setRecent] = useCachedState<string[]>("recent-symbols", []);
  const {
    data: index,
    isLoading: indexLoading,
    error: indexError,
    revalidate: reloadIndex,
  } = usePromise(loadIndex, [], {
    failureToastOptions: { title: "Could not load the symbol list" },
  });

  const language: Language = readerLanguage(preferences.nameLanguage ?? "auto", searchText, SYSTEM_LOCALE);
  const markets = MARKET_FILTERS.find((entry) => entry.value === filter)?.markets ?? [];

  const sections = useMemo(() => {
    const query = searchText.trim();
    const allowed = (instrument: Instrument) => markets.length === 0 || markets.includes(instrument.market);
    if (!query) {
      const lookup = (symbol: string) => index?.lookup(symbol, language) ?? typedInstrument(symbol, undefined) ?? null;
      const recents = recent.map(lookup).filter((item): item is Instrument => item !== null && allowed(item));
      const indices = INDICES.map((entry) => lookup(entry.symbol)).filter(
        (item): item is Instrument => item !== null && allowed(item) && !recent.includes(item.symbol),
      );
      const browse = markets.length && !markets.includes("index") && index ? index.top(markets, 30, language) : [];
      return [
        { title: "Recent", items: recents },
        { title: "Indices", items: indices },
        { title: "Most Valuable", items: browse.filter((item) => !recent.includes(item.symbol)) },
      ];
    }
    const hits = index ? index.search(query, { language, markets, limit: 30 }).map((hit) => hit.instrument) : [];
    // A ticker or pair the catalog does not list can still be priced by its source.
    // Offered when it reads as a ticker (a suffix, a caret, a pair) or nothing else matched, not for every name typed.
    const typed = typedInstrument(query, index);
    const looksLikeTicker = typed !== null && (/[./^=]/.test(query) || hits.length === 0);
    const extra =
      typed && looksLikeTicker && allowed(typed) && !hits.some((hit) => hit.symbol === typed.symbol) ? [typed] : [];
    // `^FTSE` or `EURUSD=X` names an instrument outright; lead with it rather than with name matches.
    const direct = { title: "Look Up Directly", items: extra };
    const results = { title: "Results", items: hits };
    const exactCode = hits.some((hit) => hit.symbol.toUpperCase() === typed?.symbol);
    return /[\^=]/.test(query) && !exactCode ? [direct, results] : [results, direct];
  }, [index, searchText, filter, language, recent]);

  const visible = useMemo(() => sections.flatMap((section) => section.items.map((item) => item.symbol)), [sections]);
  // List rows carry a price only while the detail pane is hidden; the pane prices the selected row itself.
  const {
    data: priced,
    isLoading: rowsLoading,
    revalidate: repriceRows,
  } = useCachedPromise(
    async (symbols: string[]) => {
      const crypto = symbols.filter(isCryptoPair);
      const stocks = symbols.filter((symbol) => !isCryptoPair(symbol));
      const [stockRows, cryptoRows] = await Promise.allSettled([
        fetchSparkQuotes(stocks),
        // One bad pair fails a Binance batch, so price pairs one by one when the batch fails.
        fetchBinanceRows(crypto).catch(async () => {
          const each = await Promise.allSettled(crypto.map((pair) => fetchBinanceRows([pair])));
          return Object.assign({}, ...each.map((result) => (result.status === "fulfilled" ? result.value : {})));
        }),
      ]);
      const failed = [
        ...(stockRows.status === "rejected" ? ["Yahoo Finance"] : []),
        ...(cryptoRows.status === "rejected" ? ["Binance"] : []),
      ];
      const quotes = {
        ...(stockRows.status === "fulfilled" ? stockRows.value : {}),
        ...(cryptoRows.status === "fulfilled" ? cryptoRows.value : {}),
      } as Record<string, RowQuote>;
      // Nothing priced: fail outright, and the hook's toast offers Retry.
      if (failed.length && Object.keys(quotes).length === 0) {
        throw new Error(`${failed.join(" and ")} did not answer.`);
      }
      return { quotes, failed };
    },
    [visible],
    {
      execute: !showingDetail && visible.length > 0,
      keepPreviousData: true,
      failureToastOptions: { title: "Could not load prices" },
    },
  );
  const rows = priced?.quotes;
  // Some rows priced and some not: keep the priced ones, and say which source failed.
  const failedSources = priced?.failed.join(" and ");
  useEffect(() => {
    if (!failedSources) return;
    showToast({
      style: Toast.Style.Failure,
      title: "Some prices could not be loaded",
      message: `${failedSources} did not answer.`,
      primaryAction: { title: "Retry", onAction: () => repriceRows() },
    });
  }, [priced]);

  const remember = (symbol: string) =>
    setRecent((current) => [symbol, ...current.filter((item) => item !== symbol)].slice(0, RECENT_LIMIT));

  const empty = !indexLoading && sections.every((section) => section.items.length === 0);

  return (
    <List
      isLoading={indexLoading || (!showingDetail && rowsLoading)}
      isShowingDetail={showingDetail && !empty}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Ticker or name: AAPL, 腾讯, 台積電, トヨタ, 삼성, BTC…"
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Market" storeValue onChange={setFilter}>
          {MARKET_FILTERS.map((entry) => (
            <List.Dropdown.Item key={entry.value} title={entry.title} value={entry.value} />
          ))}
        </List.Dropdown>
      }
    >
      {indexError && !index ? (
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title="Could not download the symbol list"
          description={`${indexError.message} Press Enter to try again.`}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={reloadIndex} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={indexLoading ? "Loading symbols…" : "No matches"}
          description={
            indexLoading
              ? "The first launch downloads Pulse's symbol list (about 1 MB)."
              : "Try a ticker (0700.HK, 7203.T), a name in any language, or a pair like ETH/BTC."
          }
        />
      )}
      {sections.map((section) => (
        <List.Section key={section.title} title={section.items.length ? section.title : undefined}>
          {section.items.map((instrument) => {
            const row = rows?.[instrument.symbol];
            return (
              <List.Item
                key={`${section.title}:${instrument.symbol}`}
                id={`${section.title}:${instrument.symbol}`}
                icon={icon(instrument)}
                title={instrument.symbol}
                subtitle={
                  instrument.name === instrument.symbol ? (instrument.exchange ?? "Yahoo Finance") : instrument.name
                }
                accessories={
                  showingDetail
                    ? undefined
                    : [
                        { tag: { value: marketTag(instrument), color: Color.SecondaryText } },
                        row
                          ? {
                              text: formatPrice(
                                row.price,
                                row.currency ?? MARKET_CURRENCIES[instrument.market] ?? null,
                              ),
                            }
                          : { text: { value: "—", color: Color.SecondaryText } },
                        {
                          text: {
                            value: formatChange(row?.changePercent),
                            color: changeColor(row?.changePercent, instrument),
                          },
                        },
                      ]
                }
                detail={showingDetail ? <QuoteDetail instrument={instrument} /> : undefined}
                actions={
                  <InstrumentActions
                    instrument={instrument}
                    showingDetail={showingDetail}
                    toggleDetail={() => setShowingDetail((value) => !value)}
                    remember={remember}
                    onUpdateCatalog={async () => {
                      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating symbol list…" });
                      try {
                        const current = (await store.loadCatalog()).value;
                        await Promise.all([store.refreshCatalog(current), store.refreshPairs()]);
                        reloadIndex();
                        toast.style = Toast.Style.Success;
                        toast.title = "Symbol list is up to date";
                      } catch (error) {
                        toast.style = Toast.Style.Failure;
                        toast.title = "Could not update the symbol list";
                        toast.message = error instanceof Error ? error.message : String(error);
                      }
                    }}
                  />
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

function InstrumentActions(props: {
  instrument: Instrument;
  showingDetail: boolean;
  toggleDetail: () => void;
  remember: (symbol: string) => void;
  onUpdateCatalog: () => void;
}) {
  const { instrument, remember } = props;
  const crypto = isCryptoPair(instrument.symbol);
  return (
    <ActionPanel title={instrument.symbol}>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          title={crypto ? "Open on Binance" : "Open in Yahoo Finance"}
          url={quotePageUrl(instrument.symbol)}
          onOpen={() => remember(instrument.symbol)}
        />
        <Action.CopyToClipboard
          title="Copy Symbol"
          content={instrument.symbol}
          onCopy={() => remember(instrument.symbol)}
        />
        {instrument.name !== instrument.symbol && (
          <Action.CopyToClipboard
            title="Copy Name"
            content={instrument.name}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title={props.showingDetail ? "Hide Chart" : "Show Chart"}
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={props.toggleDetail}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Pulse for Mac" icon={Icon.AppWindowSidebarRight} url={PULSE_FOR_MAC_URL} />
        <Action title="Update Symbol List" icon={Icon.ArrowClockwise} onAction={props.onUpdateCatalog} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function QuoteDetail({ instrument }: { instrument: Instrument }) {
  const {
    data: quote,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(fetchQuote, [instrument.symbol], {
    keepPreviousData: false,
  });

  // Keep the selected quote current while the pane stays open.
  useEffect(() => {
    const timer = setInterval(revalidate, 60_000);
    return () => clearInterval(timer);
  }, [instrument.symbol]);

  if (!quote) {
    return (
      <List.Item.Detail
        isLoading={isLoading}
        markdown={
          error
            ? `### ${instrument.symbol}\n\n${error.message}`
            : `### ${instrument.symbol}\n\n${instrument.name === instrument.symbol ? "" : instrument.name}`
        }
      />
    );
  }
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={detailMarkdown(instrument, quote)}
      // A fresh key per quote: Raycast can keep a label at the width of the value it showed before.
      metadata={<QuoteMetadata key={`${quote.symbol}:${quote.fetchedAt}`} quote={quote} instrument={instrument} />}
    />
  );
}

function detailMarkdown(instrument: Instrument, quote: Quote): string {
  const now = Date.now();
  const title = instrument.name === instrument.symbol && quote.name ? quote.name : instrument.name;
  const svg = chartSvg({
    series: quote.series,
    reference: quote.previousClose,
    window: quote.window,
    appearance: environment.appearance === "light" ? "light" : "dark",
    redForGains: redForGains(instrument),
    time: (timestamp) => formatTimestamp(timestamp, now),
  });
  // One line above the chart keeps the whole chart above the metadata.
  return [
    `**${title}** · ${formatPrice(quote.price, quote.currency)} · ${formatChange(quote.changePercent)}`,
    svg ? chartMarkdown(svg) : "_No chart for today yet._",
  ].join("\n\n");
}

function QuoteMetadata({ quote, instrument }: { quote: Quote; instrument: Instrument }) {
  const now = Date.now();
  const price = (value: number | null) => (value === null ? "—" : formatNumber(value, quote.currency));
  const crypto = quote.source === "Binance Spot";
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.TagList title={crypto ? "24h Change" : "Change"}>
        <List.Item.Detail.Metadata.TagList.Item
          text={formatChange(quote.changePercent)}
          color={changeColor(quote.changePercent, instrument)}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label title="Open" text={price(quote.open)} />
      <List.Item.Detail.Metadata.Label title="High" text={price(quote.high)} />
      <List.Item.Detail.Metadata.Label title="Low" text={price(quote.low)} />
      <List.Item.Detail.Metadata.Label title={crypto ? "24h Ago" : "Prev Close"} text={price(quote.previousClose)} />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Market"
        text={[quote.exchangeName ?? marketTag(instrument), quote.currency, SESSION_LABELS[quote.session]]
          .filter(Boolean)
          .join(" · ")}
      />
      <List.Item.Detail.Metadata.Label
        title="Last Update"
        text={`${formatTimestamp(quote.timestamp, now)} · ${formatDelay(quote)}`}
      />
      <List.Item.Detail.Metadata.Label title="Source" text={quote.source} />
    </List.Item.Detail.Metadata>
  );
}
