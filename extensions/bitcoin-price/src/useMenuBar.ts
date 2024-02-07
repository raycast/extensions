import { getPreferenceValues } from "@raycast/api";
import type { Perferences, Data } from "#/types";
import { useSource } from "#/sources";
import { formatCurrency, formatNumber, formatPercent } from "./utils";

export function useMenuBar() {
  const { source, currency, style } = getPreferenceValues<Perferences>();

  const { isLoading, data } = useSource(source, currency);

  if (isLoading || !data) {
    return { isLoading, title: "Loading...", items: [] };
  }

  const title = genTitle(data, style, currency);
  const items = Object.entries(data.more).map(([name, value]) => ({
    title: `${name}: ${value}`,
    onAction: () => null,
  }));

  return {
    title,
    items,
  };
}

function genTitle(data: Data, style: string, currency: string) {
  const { price, high24h, low24h, priceDisplay } = data.basic;
  switch (style) {
    case "price": {
      return formatCurrency(price, currency);
    }
    case "low24h-price-high24h": {
      const down = price - low24h;
      const up = high24h - price;
      return `${formatNumber(down)} ${priceDisplay} ${formatNumber(up)}`;
    }
    case "low24hPercent-price-high24hPrecent": {
      const down = -(low24h - price) / price;
      const up = (high24h - price) / price;
      return `${formatPercent(down)} ${priceDisplay} ${formatPercent(up)}`;
    }
    default: {
      throw new Error(`Invalid style: ${style}`);
    }
  }
}
