export type PriceMarket = "US" | "UK" | "EU";
export type UsedPrices = Partial<Record<PriceMarket, number>>;
const formatters = {
  US: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  UK: new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }),
  EU: new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }),
};

export function formatUsedPrice(
  prices: UsedPrices | undefined,
  market: PriceMarket,
  legacyUsd?: number | null,
): string | undefined {
  const amount = prices?.[market] ?? (market === "US" ? legacyUsd : null);
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0)
    return undefined;
  return `~${formatters[market].format(amount / 100)}`;
}
