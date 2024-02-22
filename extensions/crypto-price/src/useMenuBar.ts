import { getPreferenceValues } from "@raycast/api";
import type { Perferences, Coin, IsCoinEnabled } from "#/types";
import { useSource } from "#/sources";
import { formatCurrency, formatNumber, formatPercent } from "./utils";

export function useMenuBar() {
  const { source, currency, style, ...rest } = getPreferenceValues<Perferences>();

  const coinSymbols = getCoinSymbols(rest);
  const { isLoading, coins } = useSource(source, currency, coinSymbols);

  if (isLoading || !coins) {
    return { isLoading, title: "Loading...", coinItems: [], moreItems: [] };
  }

  const { BTC, ...restCoins } = coins;
  const title = genTitle(BTC, style, currency);
  const moreItems = Object.entries(BTC.more).map(([name, value]) => ({
    title: `${name}: ${value}`,
    onAction: () => null,
  }));
  const coinItems = Object.values(restCoins).map((coin) => ({
    title: `${coin.symbol}: ${coin.priceDisplay}`,
    onAction: () => null,
  }));

  return {
    title,
    coinItems,
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

function getCoinSymbols({ isETHEnabled, isBNBEnabled, isSOLEnabled, isXRPEnabled }: IsCoinEnabled): string[] {
  const symbols = ["BTC"];
  if (isETHEnabled) symbols.push("ETH");
  if (isBNBEnabled) symbols.push("BNB");
  if (isSOLEnabled) symbols.push("SOL");
  if (isXRPEnabled) symbols.push("XRP");
  return symbols;
}
