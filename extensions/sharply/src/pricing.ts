import { execFile } from "node:child_process";
import { promisify } from "node:util";

export type PriceMarket = "US" | "UK" | "EU";
export type MarketPreference = "automatic" | PriceMarket;
export type UsedPrices = Partial<Record<PriceMarket, number>>;
const euCountries = new Set(
  "AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE".split(
    " ",
  ),
);
const formatters = {
  US: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
  UK: new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }),
  EU: new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }),
};

export function marketForLocale(locale: string): PriceMarket {
  try {
    const region = new Intl.Locale(
      locale.trim().replaceAll("_", "-").split("@")[0],
    ).region;
    if (region === "GB") return "UK";
    if (region && euCountries.has(region)) return "EU";
  } catch {
    // Missing or unsupported locale uses the default market.
  }
  return "US";
}

export async function detectMarket(): Promise<PriceMarket> {
  try {
    const { stdout } = await promisify(execFile)(
      "/usr/bin/defaults",
      ["read", "-g", "AppleLocale"],
      { timeout: 2000 },
    );
    return marketForLocale(stdout);
  } catch {
    return "US";
  }
}

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
