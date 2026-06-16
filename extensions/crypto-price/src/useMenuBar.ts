import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { Preferences, Coin } from "#/types";
import { fetchPrices } from "#/sources";
import { formatCurrency, formatNumber, formatPercent, processCoinsText } from "./utils";

export function useMenuBar() {
  const { source, currency, style, coins: coinsText, cryptoCompareApiKey } = getPreferenceValues<Preferences>();

  const coinsConfig = processCoinsText(coinsText);
  const { isLoading, data } = useCachedPromise(
    fetchPrices,
    [source, currency, coinsConfig.symbols, cryptoCompareApiKey ?? ""],
    {
      keepPreviousData: true,
      // Menu-bar commands can't show a toast — without onError, @raycast/utils tries to
      // (showFailureToast) on an interactive open and crashes the command ("Something went
      // wrong"). Handling the error here keeps the last cached prices and stays silent.
      onError: (error) => {
        console.error("crypto-price: price fetch failed", error);
      },
    },
  );

  const coins = data?.coins;
  const activeSource = data?.source;

  let title = "Loading...";
  let items: string[] = [];
  let sections: { title: string; items: string[] }[] = [];

  if (!isLoading && !coins) {
    title = "Unavailable";
  } else if (coins) {
    const primarySymbols = coinsConfig.symbols.slice(0, coinsConfig.primaryCount);
    const secondarySymbols = coinsConfig.symbols.slice(coinsConfig.primaryCount);
    const primaryCoins = primarySymbols.flatMap((symbol) => {
      const coin = coins[symbol];
      return coin ? [coin] : [];
    });
    const secondaryCoins = secondarySymbols.flatMap((symbol) => {
      const coin = coins[symbol];
      return coin ? [coin] : [];
    });

    title = primaryCoins.map((coin) => genTitle(coin, style)).join(" | ");
    items = secondaryCoins.map((coin) => `${coin.symbol}: ${coin.priceDisplay}`);
    sections = primaryCoins.map((coin) => {
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
    activeSource,
  };
}

function genTitle(coin: Coin, style: string) {
  const { price, high24h, low24h, priceDisplay, quoteCurrency } = coin;
  // Never throw from here: a render-time throw in a menu-bar command shows "Something went wrong".
  try {
    switch (style) {
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
      case "price":
      default: {
        return formatCurrency(price, quoteCurrency);
      }
    }
  } catch {
    return priceDisplay;
  }
}
