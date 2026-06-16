import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { useState } from "react";
import { getMetaAndAssetCtxs, getPerpDexs, PerpDexMeta } from "./utils/hyperliquid";

interface Market {
  name: string;
  baseName: string;
  dexName: string;
  dexLabel: string;
  price: number;
  markPrice: number;
  oraclePrice: number;
  previousDayPrice: number;
  dailyVolume: number;
  openInterest: number;
  fundingRate: number;
  maxLeverage: number;
  sizeDecimals: number;
  onlyIsolated: boolean;
}

function getDexLabel(dex: PerpDexMeta | null): string {
  if (!dex) {
    return "Hyperliquid";
  }

  return dex.fullName ?? dex.full_name ?? dex.name;
}

async function getMarketsForDex(dex: PerpDexMeta | null): Promise<Market[]> {
  const dexName = dex?.name ?? "";
  const [meta, contexts] = await getMetaAndAssetCtxs(dexName);

  return meta.universe
    .map((asset, index): Market | null => {
      const context = contexts[index];
      const markPrice = Number(context?.markPx ?? 0);
      const midPrice = Number(context?.midPx ?? 0);
      const price = midPrice || markPrice;
      const name = asset.name.includes(":") || !dexName ? asset.name : `${dexName}:${asset.name}`;
      // `name` keeps the "dex:" prefix as the unique key/URL/icon; `baseName`
      // is the bare ticker shown as the list title (the DEX is in the detail).
      const baseName = name.includes(":") ? (name.split(":").at(-1) ?? name) : name;

      if (price <= 0 || asset.isDelisted === true) {
        return null;
      }

      return {
        name,
        baseName,
        dexName,
        dexLabel: getDexLabel(dex),
        price,
        markPrice,
        oraclePrice: Number(context?.oraclePx ?? 0),
        previousDayPrice: Number(context?.prevDayPx ?? 0),
        dailyVolume: Number(context?.dayNtlVlm ?? 0),
        // openInterest from the API is in base-asset units; convert to USD notional
        openInterest: Number(context?.openInterest ?? 0) * markPrice,
        fundingRate: Number(context?.funding ?? 0),
        maxLeverage: asset.maxLeverage,
        sizeDecimals: asset.szDecimals,
        onlyIsolated: asset.onlyIsolated === true,
      };
    })
    .filter((market): market is Market => market !== null)
    .sort((a, b) => b.dailyVolume - a.dailyVolume);
}

async function getMarkets(): Promise<Market[]> {
  const dexs = await getPerpDexs();
  const marketsByDex = await Promise.allSettled(dexs.map((dex) => getMarketsForDex(dex)));

  return marketsByDex
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => b.dailyVolume - a.dailyVolume);
}

// The "Top Markets" filter keeps only the highest-open-interest market for each
// base ticker, hiding builder-DEX duplicates of the liquid Hyperliquid perps
// (e.g. a dead HYPE clone next to the real one). Returns the names to keep.
function topMarketNamesBySymbol(markets: Market[]): Set<string> {
  const best = new Map<string, Market>();
  for (const market of markets) {
    const key = market.baseName.toUpperCase();
    const current = best.get(key);
    if (!current || market.openInterest > current.openInterest) {
      best.set(key, market);
    }
  }
  return new Set(Array.from(best.values(), (market) => market.name));
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  // 5 significant figures capped at 2 decimals; sub-cent prices keep their
  // significant figures (a 2-decimal cap would render them as $0.00)
  const rounded = Number(value.toPrecision(5));

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: rounded >= 0.01 ? 2 : 8,
  }).format(rounded);
}

function formatCompactUsd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number, fractionDigits = 1): string {
  if (!Number.isFinite(value)) {
    return "-";
  }

  // U+2212 minus sign matches the width of "+" in the UI font (the ASCII
  // hyphen is narrower), keeping positive and negative tags the same width
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(fractionDigits)}%`;
}

function getDailyChange(market: Market): number {
  if (market.previousDayPrice <= 0) {
    return 0;
  }

  return ((market.markPrice - market.previousDayPrice) / market.previousDayPrice) * 100;
}

function getMarketUrl(market: Market): string {
  return `https://app.hyperliquid.xyz/trade/${encodeURIComponent(market.name)}`;
}

function getMarketIcon(market: Market): Image.ImageLike {
  return {
    source: `https://app.hyperliquid.xyz/coins/${encodeURIComponent(market.name)}.svg`,
    fallback: "search-markets-icon.png",
    mask: Image.Mask.Circle,
  };
}

// Accessories aren't grid-aligned across rows, so pad each value to a fixed
// width with figure spaces (digit-width) to keep the columns lined up.
const FIGURE_SPACE = " "; // width of a digit
const PUNCTUATION_SPACE = " "; // width of a period/comma
const PRICE_COLUMN_WIDTH = 11;
const COMPACT_USD_COLUMN_WIDTH = 8;
const CHANGE_COLUMN_WIDTH = 6;

function padColumn(text: string, width: number): string {
  // Periods and commas are roughly half a digit wide, so a pure character
  // count under-pads values like "$0.009004"; add a punctuation space per
  // [.,] so every value in a column lands on the same visual width.
  const punctuation = (text.match(/[.,]/g) ?? []).length;
  const fill = Math.max(0, width - text.length);
  return FIGURE_SPACE.repeat(fill) + PUNCTUATION_SPACE.repeat(punctuation) + text;
}

// Raycast does not support true accessory-column headers. Keep the labels in
// the section subtitle and tune only these padding counts.
const PAD = " ";
const FAVORITES_LEGEND = `${PAD.repeat(82)}24h${PAD.repeat(25)}Vol${PAD.repeat(22)}OI`;
const PERPETUALS_LEGEND = `${PAD.repeat(75)}24h${PAD.repeat(25)}Vol${PAD.repeat(22)}OI`;

function MarketListItem(props: {
  market: Market;
  isFavorite: boolean;
  showingDetail: boolean;
  onToggleFavorite: (market: Market) => void;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  const { market, isFavorite, showingDetail, onToggleFavorite, onToggleDetail, onRefresh } = props;
  const dailyChange = getDailyChange(market);
  const fundingHourly = market.fundingRate * 100;
  // Hyperliquid funding accrues hourly; annualize for an at-a-glance carry cost.
  const fundingApr = market.fundingRate * 24 * 365 * 100;

  // Detail view collapses the list to a narrow left column, so show only the
  // price there (everything else lives in the metadata pane on the right). The
  // table view keeps all four padColumn-aligned columns.
  const accessories: List.Item.Accessory[] = showingDetail
    ? [{ text: formatUsd(market.price), tooltip: "Price" }]
    : [
        { text: padColumn(formatUsd(market.price), PRICE_COLUMN_WIDTH), tooltip: "Price" },
        {
          tag: {
            value: padColumn(formatPercent(dailyChange), CHANGE_COLUMN_WIDTH),
            color: dailyChange >= 0 ? Color.Green : Color.Red,
          },
          tooltip: "24h change",
        },
        {
          text: padColumn(formatCompactUsd(market.dailyVolume), COMPACT_USD_COLUMN_WIDTH),
          tooltip: "24h notional volume",
        },
        {
          text: padColumn(formatCompactUsd(market.openInterest), COMPACT_USD_COLUMN_WIDTH),
          tooltip: "Open interest (notional)",
        },
      ];

  return (
    <List.Item
      icon={getMarketIcon(market)}
      title={market.baseName}
      keywords={[
        market.name.toLowerCase(),
        market.baseName.toLowerCase(),
        market.dexName.toLowerCase(),
        market.dexLabel.toLowerCase(),
        `${market.maxLeverage}x`,
      ]}
      accessories={accessories}
      detail={
        <List.Item.Detail
          metadata={
            // Title + price already live in the slim left column, so the pane
            // skips a redundant header and leads with the live, color-coded
            // numbers a trader scans first; DEX (source) sits last.
            <List.Item.Detail.Metadata>
              {/* Empty leading row: breathing room so the pane doesn't start
                  flush against the top edge. */}
              <List.Item.Detail.Metadata.Label title="" />
              {/* Every row is a plain Label for uniform line height; only the
                  signed 24h change carries text color (green up / red down). */}
              <List.Item.Detail.Metadata.Label
                title="24h Change"
                text={{ value: formatPercent(dailyChange), color: dailyChange >= 0 ? Color.Green : Color.Red }}
              />
              <List.Item.Detail.Metadata.Label title="24h Volume" text={formatCompactUsd(market.dailyVolume)} />
              <List.Item.Detail.Metadata.Label title="Open Interest" text={formatCompactUsd(market.openInterest)} />
              <List.Item.Detail.Metadata.Label title="Funding / Hour" text={formatPercent(fundingHourly, 4)} />
              <List.Item.Detail.Metadata.Label title="Funding APR" text={formatPercent(fundingApr, 2)} />

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label title="Mark Price" text={formatUsd(market.markPrice)} />
              <List.Item.Detail.Metadata.Label title="Oracle Price" text={formatUsd(market.oraclePrice)} />

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label title="Max Leverage" text={`${market.maxLeverage}x`} />
              <List.Item.Detail.Metadata.Label
                title="Margin"
                text={market.onlyIsolated ? "Isolated Only" : "Cross + Isolated"}
              />
              <List.Item.Detail.Metadata.Label title="Size Decimals" text={String(market.sizeDecimals)} />

              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label title="DEX" text={market.dexLabel} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Market" url={getMarketUrl(market)} />
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.AppWindowSidebarRight}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
          <Action
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={isFavorite ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={() => onToggleFavorite(market)}
          />
          <Action.CopyToClipboard title="Copy Symbol" content={market.name} />
          <Action.CopyToClipboard title="Copy Base Symbol" content={market.baseName} />
          <Action.CopyToClipboard title="Copy Price" content={String(market.price)} />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

export default function SearchMarkets() {
  const { data: markets, isLoading, revalidate, error } = usePromise(getMarkets);
  const {
    value: favorites,
    setValue: setFavorites,
    isLoading: isLoadingFavorites,
  } = useLocalStorage<string[]>("favorite-markets", []);

  // Master-detail is the default: a slim left list (icon + ticker + price)
  // with the full metadata pane on the right, updating as you arrow through.
  // ⌘D flips to the dense multi-column table. The padded column legend (see
  // COLUMN_LEGEND notes) only lines up in the wide table, so both section
  // subtitles below drop it while showingDetail is true.
  const [showingDetail, setShowingDetail] = useState(true);
  const [searchText, setSearchText] = useState("");
  // "top" hides builder-DEX duplicates (one market per symbol); "all" shows
  // every market. Favorites bypass this filter (see below).
  const [marketFilter, setMarketFilter] = useState("top");

  const allMarkets = markets ?? [];

  // Native filtering preserves input order, so to surface the strongest matches
  // first we feed the list open-interest-sorted while searching, and keep the
  // default 24h-volume order (from getMarkets) when the search box is empty.
  const orderedMarkets = searchText.trim()
    ? [...allMarkets].sort((a, b) => b.openInterest - a.openInterest)
    : allMarkets;

  // The "Top Markets" filter keeps only the most-liquid market per symbol, but
  // an explicitly favorited market always shows regardless of the filter.
  const topNames = marketFilter === "top" ? topMarketNamesBySymbol(allMarkets) : null;

  const favoriteNames = new Set(favorites ?? []);
  const favoriteMarkets = orderedMarkets.filter((market) => favoriteNames.has(market.name));
  const otherMarkets = orderedMarkets.filter(
    (market) => !favoriteNames.has(market.name) && (!topNames || topNames.has(market.name)),
  );
  const legendOnFavorites = favoriteMarkets.length > 0;

  async function toggleFavorite(market: Market) {
    const current = favorites ?? [];
    await setFavorites(
      favoriteNames.has(market.name) ? current.filter((name) => name !== market.name) : [...current, market.name],
    );
  }

  return (
    <List
      isLoading={isLoading || isLoadingFavorites}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search Hyperliquid markets..."
      onSearchTextChange={setSearchText}
      throttle
      filtering={{ keepSectionOrder: true }}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Markets" value={marketFilter} onChange={setMarketFilter}>
          <List.Dropdown.Item title="Top Markets" value="top" icon={Icon.Star} />
          <List.Dropdown.Item title="All Markets" value="all" icon={Icon.List} />
        </List.Dropdown>
      }
    >
      {favoriteMarkets.length > 0 && (
        <List.Section
          title="Favorites"
          subtitle={`${favoriteMarkets.length} favorite${favoriteMarkets.length === 1 ? "" : "s"}${showingDetail ? "" : FAVORITES_LEGEND}`}
        >
          {favoriteMarkets.map((market) => (
            <MarketListItem
              key={market.name}
              market={market}
              isFavorite
              showingDetail={showingDetail}
              onToggleFavorite={toggleFavorite}
              onToggleDetail={() => setShowingDetail((value) => !value)}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      )}
      <List.Section
        title="Perpetuals"
        subtitle={
          markets
            ? `${otherMarkets.length} markets${legendOnFavorites || showingDetail ? "" : PERPETUALS_LEGEND}`
            : undefined
        }
      >
        {otherMarkets.map((market) => (
          <MarketListItem
            key={market.name}
            market={market}
            isFavorite={false}
            showingDetail={showingDetail}
            onToggleFavorite={toggleFavorite}
            onToggleDetail={() => setShowingDetail((value) => !value)}
            onRefresh={revalidate}
          />
        ))}
      </List.Section>
      {!isLoading && (
        <List.EmptyView
          icon={error ? Icon.Warning : searchText ? Icon.MagnifyingGlass : Icon.LineChart}
          title={error ? "Couldn’t Load Markets" : searchText ? "No Matching Markets" : "No Markets Found"}
          description={
            error
              ? "Hyperliquid’s API couldn’t be reached. Check your connection and try again."
              : searchText
                ? "Try a different symbol or DEX name, or switch to All Markets."
                : "No market data is available right now. Try refreshing."
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
