import { getPreferenceValues } from "@raycast/api";
import type { Perferences, Coin } from "#/types";
import { useSource } from "#/sources";
import { formatCurrency, formatNumber, formatPercent, processCoinsText } from "./utils";

export function useMenuBar() {
  const { source, currency, style, coins: coinsText } = getPreferenceValues<Perferences>();

  const coinsConfig = processCoinsText(coinsText);
  const { isLoading, coins } = useSource(source, currency, coinsConfig.symbols);

  let title = "Loading...";
  let items: string[] = [];
  let sections: { title: string; items: string[] }[] = [];

  if (!isLoading && coins) {
    const primarySymbols = coinsConfig.symbols.slice(0, coinsConfig.primaryCount);
    const secondarySymbols = coinsConfig.symbols.slice(coinsConfig.primaryCount);
    title = primarySymbols.map((symbol) => genTitle(coins[symbol], style, currency)).join(" | ");
    items = secondarySymbols.map((symbol) => {
      const coin = coins[symbol];
      return `${coin.symbol}: ${coin.priceDisplay}`;
    });
    sections = primarySymbols.map((symbol) => {
      const coin = coins[symbol];
      return {
        title: coin.name,
        items: Object.entries(coin.more).map(([name, value]) => `${name}: ${value}`),
      };
    });
  }

  return {
    isLoading,
    title,
    items,
    sections,
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
