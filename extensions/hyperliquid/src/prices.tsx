import { Color, Icon, MenuBarExtra, getPreferenceValues, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { formatPercentChange, formatPrice, getSignedColor } from "./lib/format";
import { aggregatePositionRows, fetchMarkets, fetchPositionStates } from "./lib/hyperliquid";
import { getHyperliquidTradeUrl } from "./lib/navigation";
import { getStoredFavorites, getStoredWallets } from "./lib/raycast-storage";
import { getPositionRisk, riskBadge, thresholdsFromPercent, worstLevel } from "./lib/risk";
import type { PositionRow, RiskLevel } from "./lib/types";

interface RiskyPosition {
  position: PositionRow;
  level: RiskLevel;
  distanceToLiq: number;
}

interface MenuBarData {
  favorites: string[];
  markets: Awaited<ReturnType<typeof fetchMarkets>>;
  risky: RiskyPosition[];
  worst: RiskLevel;
}

async function loadAtRiskPositions(thresholds: ReturnType<typeof thresholdsFromPercent>): Promise<RiskyPosition[]> {
  try {
    const wallets = await getStoredWallets();
    if (wallets.length === 0) {
      return [];
    }

    const { positions } = aggregatePositionRows(wallets, await fetchPositionStates(wallets));
    return positions
      .map((position) => {
        const risk = getPositionRisk(position.markPrice, position.liquidationPrice, thresholds);
        return { position, level: risk.level, distanceToLiq: risk.distanceToLiq ?? 1 };
      })
      .filter((entry) => entry.level !== "safe")
      .sort((a, b) => a.distanceToLiq - b.distanceToLiq);
  } catch {
    // Never let a position fetch failure hide favorite prices.
    return [];
  }
}

async function loadMenuBarData(thresholds: ReturnType<typeof thresholdsFromPercent>): Promise<MenuBarData> {
  const [favorites, markets, risky] = await Promise.all([
    getStoredFavorites(),
    fetchMarkets(),
    loadAtRiskPositions(thresholds),
  ]);
  return { favorites, markets, risky, worst: worstLevel(risky.map((entry) => entry.level)) };
}

function colorFor(value: number): Color {
  const color = getSignedColor(value);
  if (color === "green") {
    return Color.Green;
  }
  if (color === "red") {
    return Color.Red;
  }
  return Color.SecondaryText;
}

function riskColor(level: RiskLevel): Color {
  if (level === "danger") {
    return Color.Red;
  }
  if (level === "warning") {
    return Color.Orange;
  }
  return Color.Green;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.Prices>();
  const thresholds = thresholdsFromPercent(Number(preferences.liqAlertDistance));
  const { data, isLoading, revalidate } = useCachedPromise(loadMenuBarData, [thresholds], {
    initialData: { favorites: [], markets: [], risky: [], worst: "safe" as RiskLevel },
    keepPreviousData: true,
  });
  const favorites = data?.favorites ?? [];
  const favoriteMarkets = (data?.markets ?? []).filter((market) => favorites.includes(market.coin));
  const risky = data?.risky ?? [];
  const worst = data?.worst ?? "safe";
  const firstMarket = favoriteMarkets[0];

  const topRisk = risky[0];
  const title =
    worst !== "safe" && topRisk
      ? `${riskBadge(worst)} ${topRisk.position.coin} ${(topRisk.distanceToLiq * 100).toFixed(0)}%`
      : firstMarket
        ? `${firstMarket.coin} ${formatPrice(firstMarket.price)}`
        : "HL";

  return (
    <MenuBarExtra
      title={title}
      icon={{ source: Icon.Bolt, tintColor: worst === "safe" ? Color.PrimaryText : riskColor(worst) }}
      tooltip="Hyperliquid favorite prices and liquidation risk"
      isLoading={isLoading}
    >
      {risky.length > 0 ? (
        <MenuBarExtra.Section title="Liquidation Risk">
          {risky.map((entry) => (
            <MenuBarExtra.Item
              key={entry.position.id}
              title={`${entry.position.coin} ${entry.position.side}`}
              subtitle={`${(entry.distanceToLiq * 100).toFixed(1)}% to liq · ${entry.position.walletLabel}`}
              icon={{ source: Icon.Warning, tintColor: riskColor(entry.level) }}
              onAction={() => open(getHyperliquidTradeUrl(entry.position.coin))}
            />
          ))}
        </MenuBarExtra.Section>
      ) : null}

      {favoriteMarkets.length === 0 ? (
        <MenuBarExtra.Item title="No favorite markets" subtitle="Star markets in Markets" />
      ) : (
        <MenuBarExtra.Section title="Favorites">
          {favoriteMarkets.map((market) => (
            <MenuBarExtra.Item
              key={market.coin}
              title={market.coin}
              subtitle={`${formatPrice(market.price)} · ${formatPercentChange(market.dayChange)}`}
              icon={{
                source: market.dayChange >= 0 ? Icon.ArrowUp : Icon.ArrowDown,
                tintColor: colorFor(market.dayChange),
              }}
              onAction={() => open(getHyperliquidTradeUrl(market.coin))}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
