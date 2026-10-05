import { Action, ActionPanel, Color, Icon, List, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";

import { ENTRY_COLOR, LIQUIDATION_COLOR, chartMarkdownImage } from "./lib/chart";
import type { ChartOverlay } from "./lib/chart";
import {
  formatCompactUsd,
  formatFundingRate,
  formatPercentChange,
  formatPrice,
  formatUsd,
  getSignedColor,
} from "./lib/format";
import {
  aggregatePositionRows,
  applyLiveMids,
  computeMarketOverview,
  fetchCandles,
  fetchMarkets,
  fetchPositionStates,
  prioritizeFavoriteMarkets,
  sortMarkets,
} from "./lib/hyperliquid";
import { getHyperliquidTradeUrl } from "./lib/navigation";
import { getStoredFavorites, getStoredWallets, setStoredFavorites } from "./lib/raycast-storage";
import { toggleFavoriteCoin } from "./lib/storage";
import type { CandleInterval, MarketRow, PositionRow } from "./lib/types";
import { useLiveMids } from "./lib/use-live-mids";

type MarketView = "all" | "favorites" | "gainers" | "losers" | "funding";

const VIEW_LABELS: Record<MarketView, string> = {
  all: "All · Volume",
  favorites: "Favorites",
  gainers: "Top Gainers",
  losers: "Top Losers",
  funding: "Highest Funding",
};

async function loadMarkets(): Promise<MarketRow[]> {
  return fetchMarkets();
}

async function loadFavorites(): Promise<string[]> {
  return getStoredFavorites();
}

async function loadCandles(coin: string, interval: CandleInterval) {
  return fetchCandles(coin, interval);
}

async function loadCoinPosition(coin: string): Promise<PositionRow | null> {
  try {
    const wallets = await getStoredWallets();
    if (wallets.length === 0) {
      return null;
    }

    const { positions } = aggregatePositionRows(wallets, await fetchPositionStates(wallets));
    return positions.find((position) => position.coin === coin) ?? null;
  } catch {
    return null;
  }
}

function raycastColor(color: ReturnType<typeof getSignedColor>): Color {
  if (color === "green") {
    return Color.Green;
  }
  if (color === "red") {
    return Color.Red;
  }
  return Color.SecondaryText;
}

function applyView(markets: MarketRow[], view: MarketView, favorites: string[], favoriteSet: Set<string>): MarketRow[] {
  switch (view) {
    case "favorites":
      return prioritizeFavoriteMarkets(markets, favorites).filter((market) => favoriteSet.has(market.coin));
    case "gainers":
      return sortMarkets(markets, "gainers");
    case "losers":
      return sortMarkets(markets, "losers");
    case "funding":
      return sortMarkets(markets, "funding");
    case "all":
    default:
      return prioritizeFavoriteMarkets(sortMarkets(markets, "volume"), favorites);
  }
}

export default function Command() {
  const [view, setView] = useState<MarketView>("all");
  const marketsState = useCachedPromise(loadMarkets, [], { initialData: [], keepPreviousData: true });
  const favoritesState = useCachedPromise(loadFavorites, [], { initialData: [] });
  const liveMids = useLiveMids(true);
  const favorites = favoritesState.data ?? [];
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);
  const liveMarkets = useMemo(() => applyLiveMids(marketsState.data ?? [], liveMids), [liveMids, marketsState.data]);
  const overview = useMemo(() => computeMarketOverview(liveMarkets), [liveMarkets]);
  const visibleMarkets = useMemo(
    () => applyView(liveMarkets, view, favorites, favoriteSet),
    [liveMarkets, view, favorites, favoriteSet],
  );

  async function toggleFavorite(coin: string) {
    const next = toggleFavoriteCoin(favorites, coin);
    await setStoredFavorites(next);
    favoritesState.revalidate();
  }

  return (
    <List
      isLoading={marketsState.isLoading || favoritesState.isLoading}
      searchBarPlaceholder="Search perp markets"
      searchBarAccessory={
        <List.Dropdown tooltip="View" value={view} onChange={(value) => setView(value as MarketView)}>
          {(Object.keys(VIEW_LABELS) as MarketView[]).map((key) => (
            <List.Dropdown.Item key={key} title={VIEW_LABELS[key]} value={key} />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => marketsState.revalidate()} />
        </ActionPanel>
      }
    >
      {visibleMarkets.length === 0 && !marketsState.isLoading ? (
        <List.EmptyView
          title={view === "favorites" ? "No Favorite Markets" : "No Markets"}
          description={view === "favorites" ? "Star markets from another view to pin them here." : undefined}
        />
      ) : (
        <List.Section
          title={`${overview.marketCount} Markets · Vol ${formatCompactUsd(overview.totalVolumeUsd)}`}
          subtitle={`OI ${formatCompactUsd(overview.totalOpenInterestUsd)}`}
        >
          {visibleMarkets.map((market) => {
            const isFavorite = favoriteSet.has(market.coin);
            const changeColor = raycastColor(getSignedColor(market.dayChange));
            return (
              <List.Item
                key={market.coin}
                title={market.coin}
                subtitle={formatPrice(market.price)}
                icon={{
                  source: isFavorite ? Icon.Star : Icon.Circle,
                  tintColor: isFavorite ? Color.Yellow : Color.SecondaryText,
                }}
                accessories={[
                  {
                    text: formatPercentChange(market.dayChange),
                    icon: { source: Icon.BarChart, tintColor: changeColor },
                  },
                  { text: formatFundingRate(market.funding) },
                  { text: formatCompactUsd(market.dayVolumeUsd) },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Open Detail"
                      icon={Icon.LineChart}
                      target={
                        <CoinDetail
                          market={market}
                          isFavorite={isFavorite}
                          onToggleFavorite={() => toggleFavorite(market.coin)}
                        />
                      }
                    />
                    <Action
                      title={isFavorite ? "Remove Favorite" : "Add Favorite"}
                      icon={isFavorite ? Icon.StarDisabled : Icon.Star}
                      onAction={() => toggleFavorite(market.coin)}
                    />
                    <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => marketsState.revalidate()} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function CoinDetail({
  market,
  isFavorite,
  onToggleFavorite,
}: {
  market: MarketRow;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const preferences = getPreferenceValues<Preferences.Markets>();
  const [interval, setInterval] = useState<CandleInterval>(preferences.defaultInterval);
  const liveMids = useLiveMids(true);
  const liveMarket = applyLiveMids([market], liveMids)[0] ?? market;
  const candlesState = useCachedPromise(loadCandles, [market.coin, interval], {
    initialData: [],
    keepPreviousData: true,
  });
  const positionState = useCachedPromise(loadCoinPosition, [market.coin], { initialData: null });
  const position = positionState.data ?? null;

  const overlays = useMemo<ChartOverlay[]>(() => {
    if (!position) {
      return [];
    }
    const lines: ChartOverlay[] = [
      { label: `Entry ${formatPrice(position.entryPrice)}`, price: position.entryPrice, color: ENTRY_COLOR },
    ];
    if (position.liquidationPrice !== null) {
      lines.push({
        label: `Liq ${formatPrice(position.liquidationPrice)}`,
        price: position.liquidationPrice,
        color: LIQUIDATION_COLOR,
      });
    }
    return lines;
  }, [position]);

  const markdown = chartMarkdownImage(candlesState.data ?? [], {
    title: `${market.coin} ${interval}`,
    width: 720,
    height: 320,
    overlays,
  });

  return (
    <List
      navigationTitle={`${market.coin} Detail`}
      isShowingDetail
      isLoading={candlesState.isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Chart Interval"
          value={interval}
          onChange={(value) => setInterval(value as CandleInterval)}
        >
          <List.Dropdown.Item title="1 hour" value="1h" />
          <List.Dropdown.Item title="4 hours" value="4h" />
          <List.Dropdown.Item title="1 day" value="1d" />
        </List.Dropdown>
      }
    >
      <List.Item
        id={market.coin}
        title={liveMarket.coin}
        subtitle={formatPrice(liveMarket.price)}
        detail={
          <List.Item.Detail
            markdown={markdown}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Live Mid" text={formatPrice(liveMarket.price)} />
                <List.Item.Detail.Metadata.Label title="Mark" text={formatPrice(liveMarket.markPrice)} />
                <List.Item.Detail.Metadata.Label
                  title="24h"
                  text={formatPercentChange(liveMarket.dayChange)}
                  icon={{ source: Icon.BarChart, tintColor: raycastColor(getSignedColor(liveMarket.dayChange)) }}
                />
                <List.Item.Detail.Metadata.Label title="Funding" text={formatFundingRate(liveMarket.funding)} />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Open Interest"
                  text={formatCompactUsd(liveMarket.openInterest * liveMarket.markPrice)}
                />
                <List.Item.Detail.Metadata.Label title="24h Volume" text={formatCompactUsd(liveMarket.dayVolumeUsd)} />
                <List.Item.Detail.Metadata.Label title="Prev Day" text={formatPrice(liveMarket.previousDayPrice)} />
                <List.Item.Detail.Metadata.Label title="Max Leverage" text={`${liveMarket.maxLeverage}x`} />
                {position ? (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Your Position"
                      text={`${position.side} ${position.leverageType} ${position.leverage}x`}
                      icon={{
                        source: position.side === "Long" ? Icon.ArrowUp : Icon.ArrowDown,
                        tintColor: raycastColor(getSignedColor(position.size)),
                      }}
                    />
                    <List.Item.Detail.Metadata.Label title="Entry" text={formatPrice(position.entryPrice)} />
                    <List.Item.Detail.Metadata.Label
                      title="uPnL"
                      text={formatUsd(position.unrealizedPnl)}
                      icon={{ source: Icon.Coins, tintColor: raycastColor(getSignedColor(position.unrealizedPnl)) }}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Liquidation"
                      text={position.liquidationPrice === null ? "—" : formatPrice(position.liquidationPrice)}
                    />
                  </>
                ) : null}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Browser" url={getHyperliquidTradeUrl(market.coin)} />
            <Action
              title={isFavorite ? "Remove Favorite" : "Add Favorite"}
              icon={isFavorite ? Icon.StarDisabled : Icon.Star}
              onAction={onToggleFavorite}
            />
            <Action title="Refresh Candles" icon={Icon.ArrowClockwise} onAction={() => candlesState.revalidate()} />
            <Action.CopyToClipboard title="Copy Coin" content={market.coin} />
          </ActionPanel>
        }
      />
    </List>
  );
}
