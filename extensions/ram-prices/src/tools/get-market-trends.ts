import { getMarketTrends } from "../data/get-market-trends";

/** Get DDR4 and DDR5 market pricing and history. Prices are averages per GB in USD, not individual RAM kit prices. */
export default async function tool() {
  const data = await getMarketTrends();

  return {
    sourceUrl: "https://ramradar.app",
    currency: "USD",
    priceUnit: "per GB",
    ...data,
  };
}
