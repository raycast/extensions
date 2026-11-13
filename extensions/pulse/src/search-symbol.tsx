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
import { showFailureToast, useCachedPromise, useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { chartMarkdown, chartSvg } from "./lib/chart";
import { addFavorites, loadFavorites, moveFavorite, removeFavorites } from "./lib/favorites";
import { SESSION_LABELS, formatChange, formatDelay, formatNumber, formatPrice, formatTimestamp } from "./lib/format";
import { loadIndex, updateCatalog } from "./lib/load-index";
import { refreshMenuBar } from "./lib/menu-bar";
import { Quote, fetchQuote, fetchRows } from "./lib/quotes";
import { readerLanguage, typedInstrument } from "./lib/search";
import {
  INDICES,
  Instrument,
  Language,
  instrumentCurrency,
  MARKET_FILTERS,
  MARKET_LABELS,
  PULSE_FOR_MAC_URL,
  isCryptoPair,
  quotePageUrl,
} from "./lib/symbols";

const SYSTEM_LOCALE = Intl.DateTimeFormat().resolvedOptions().locale;
const RECENT_LIMIT = 12;

const FAVORITES_SECTION = "Favorites";
const FAVORITE_ACCESSORY: List.Item.Accessory = {
  icon: { source: Icon.Star, tintColor: Color.Yellow },
  tooltip: "Favorite",
};
const FAVORITE_ICON = { value: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Favorite" };

const changeColor = (value: number | null | undefined) =>
  value === null || value === undefined ? Color.SecondaryText : value >= 0 ? Color.Green : Color.Red;

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
  const { data: favorites = [], mutate: mutateFavorites } = usePromise(loadFavorites);
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
      // A favorite is named in the reader's language when the catalog lists it, else as it was pinned.
      const pinned = favorites.map((favorite) => index?.lookup(favorite.symbol, language) ?? favorite).filter(allowed);
      const shown = new Set(favorites.map((favorite) => favorite.symbol));
      const recents = recent
        .filter((symbol) => !shown.has(symbol))
        .map(lookup)
        .filter((item): item is Instrument => item !== null && allowed(item));
      recent.forEach((symbol) => shown.add(symbol));
      const indices = INDICES.map((entry) => lookup(entry.symbol)).filter(
        (item): item is Instrument => item !== null && allowed(item) && !shown.has(item.symbol),
      );
      const browse = markets.length && !markets.includes("index") && index ? index.top(markets, 30, language) : [];
      return [
        { title: FAVORITES_SECTION, items: pinned },
        { title: "Recent", items: recents },
        { title: "Indices", items: indices },
        { title: "Most Valuable", items: browse.filter((item) => !shown.has(item.symbol)) },
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
  }, [index, searchText, filter, language, recent, favorites]);

  const visible = useMemo(() => sections.flatMap((section) => section.items.map((item) => item.symbol)), [sections]);
  // List rows carry a price only while the detail pane is hidden; the pane prices the selected row itself.
  const {
    data: priced,
    isLoading: rowsLoading,
    revalidate: repriceRows,
  } = useCachedPromise(fetchRows, [visible], {
    execute: !showingDetail && visible.length > 0,
    keepPreviousData: true,
    failureToastOptions: { title: "Could not load prices" },
  });
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

  const favoriteSymbols = useMemo(() => new Set(favorites.map((favorite) => favorite.symbol)), [favorites]);

  const changeFavorites = async (update: Promise<unknown>, success: string, instrument: Instrument) => {
    try {
      await mutateFavorites(update);
      await showToast({ style: Toast.Style.Success, title: success, message: instrument.symbol });
      refreshMenuBar();
    } catch (error) {
      await showFailureToast(error, { title: "Could not update favorites" });
    }
  };

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
            // Outside its own section a favorite is starred: in the icon while the chart hides accessories.
            const starred = favoriteSymbols.has(instrument.symbol) && section.title !== FAVORITES_SECTION;
            return (
              <List.Item
                key={`${section.title}:${instrument.symbol}`}
                id={`${section.title}:${instrument.symbol}`}
                icon={showingDetail && starred ? FAVORITE_ICON : icon(instrument)}
                title={instrument.symbol}
                subtitle={
                  instrument.name === instrument.symbol ? (instrument.exchange ?? "Yahoo Finance") : instrument.name
                }
                accessories={
                  showingDetail
                    ? undefined
                    : [
                        ...(starred ? [FAVORITE_ACCESSORY] : []),
                        { tag: { value: marketTag(instrument), color: Color.SecondaryText } },
                        row
                          ? {
                              text: formatPrice(row.price, row.currency ?? instrumentCurrency(instrument)),
                            }
                          : { text: { value: "—", color: Color.SecondaryText } },
                        { text: { value: formatChange(row?.changePercent), color: changeColor(row?.changePercent) } },
                      ]
                }
                detail={showingDetail ? <QuoteDetail instrument={instrument} /> : undefined}
                actions={
                  <InstrumentActions
                    instrument={instrument}
                    showingDetail={showingDetail}
                    toggleDetail={() => setShowingDetail((value) => !value)}
                    remember={remember}
                    favorite={favoriteSymbols.has(instrument.symbol)}
                    toggleFavorite={() =>
                      favoriteSymbols.has(instrument.symbol)
                        ? changeFavorites(removeFavorites([instrument.symbol]), "Removed from favorites", instrument)
                        : changeFavorites(addFavorites([instrument]), "Added to favorites", instrument)
                    }
                    moveFavorite={
                      section.title === FAVORITES_SECTION && !searchText.trim() && filter === "all"
                        ? (offset) => mutateFavorites(moveFavorite(instrument.symbol, offset)).then(refreshMenuBar)
                        : undefined
                    }
                    favoritePosition={favorites.findIndex((favorite) => favorite.symbol === instrument.symbol)}
                    favoriteCount={favorites.length}
                    onUpdateCatalog={async () => {
                      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating symbol list…" });
                      try {
                        await updateCatalog();
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
  favorite: boolean;
  toggleFavorite: () => void;
  /** Set only on rows of the Favorites section while it shows every favorite in order. */
  moveFavorite?: (offset: -1 | 1) => void;
  favoritePosition: number;
  favoriteCount: number;
  onUpdateCatalog: () => void;
}) {
  const { instrument, remember, moveFavorite } = props;
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
          title={props.favorite ? "Remove from Favorites" : "Add to Favorites"}
          icon={props.favorite ? Icon.StarDisabled : Icon.Star}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={props.toggleFavorite}
        />
        {moveFavorite && props.favoritePosition > 0 && (
          <Action
            title="Move Favorite Higher"
            icon={Icon.ArrowUp}
            shortcut={Keyboard.Shortcut.Common.MoveUp}
            onAction={() => moveFavorite(-1)}
          />
        )}
        {moveFavorite && props.favoritePosition >= 0 && props.favoritePosition < props.favoriteCount - 1 && (
          <Action
            title="Move Favorite Lower"
            icon={Icon.ArrowDown}
            shortcut={Keyboard.Shortcut.Common.MoveDown}
            onAction={() => moveFavorite(1)}
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
          color={changeColor(quote.changePercent)}
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
