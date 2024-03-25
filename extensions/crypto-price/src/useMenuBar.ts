import { getPreferenceValues } from "@raycast/api";
import type { Perferences, Coin } from "#/types";
import { useSource } from "#/sources";
import { formatCurrency, formatNumber, formatPercent, getCoinInfos } from "./utils";

export function useMenuBar() {
  const { source, currency, style, coins: coinsText } = getPreferenceValues<Perferences>();

  const coinInfos = getCoinInfos(coinsText);
  const { isLoading, coins } = useSource(source, currency, coinInfos);

  if (isLoading || !coins) {
    return { isLoading, title: "Loading...", coinItems: [], moreItems: [] };
  }

  const [mainCoin, ...restCoins] = coins;
  const title = genTitle(mainCoin, style, currency);
  const coinItems = restCoins.map((coin) => ({
    title: `${coin.symbol}: ${coin.priceDisplay}`,
    onAction: () => null,
  }));
  const moreTitle = mainCoin.name;
  const moreItems = Object.entries(mainCoin.more).map(([name, value]) => ({
    title: `${name}: ${value}`,
    onAction: () => null,
  }));

  return {
    title,
    coinItems,
    moreTitle,
    moreItems,
  };
}

function genTitle(coin: Coin, style: string, currency: string) {
  const { price, high24h, low24h, priceDisplay } = coin;
  switch (style) {
    case "price": {
      return formatCurrency(price, currency);
    }
    case "down24h-price-up24h": {
      const down = price - low24h;
      const up = high24h - price;
      return `${formatNumber(down)} ${priceDisplay} ${formatNumber(up)}`;
    }
    case "down24hPercent-price-up24hPercent": {
      const down = -(low24h - price) / price;
      const up = (high24h - price) / price;
      return `${formatPercent(down)} ${priceDisplay} ${formatPercent(up)}`;
    }
    default: {
      throw new Error(`Invalid style: ${style}`);
    }
  }
}
