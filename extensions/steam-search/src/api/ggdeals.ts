import { CURRENCY_SYMBOLS } from "../constants";

export const ggDealsCache = new Map<string, string | null>();

export async function batchFetchGGDeals(
  appIds: number[],
  apiKey: string,
  region: string,
): Promise<void> {
  const missing = appIds.filter((id) => !ggDealsCache.has(`${id}-${region}`));
  if (!missing.length) return;

  try {
    const res = await fetch(
      `https://api.gg.deals/v1/prices/by-steam-app-id/?key=${apiKey}&ids=${missing.join(",")}&region=${region}`,
    );
    const data = (await res.json()) as {
      data?: Record<string, { prices?: { currentKeyshops?: string } }>;
    };

    for (const id of missing) {
      const game = data?.data?.[String(id)];
      if (game?.prices) {
        const keyshop = parseFloat(game.prices.currentKeyshops ?? "");
        ggDealsCache.set(
          `${id}-${region}`,
          !isNaN(keyshop)
            ? `🔑 ${keyshop.toFixed(2)}${CURRENCY_SYMBOLS[region] ?? "€"}`
            : null,
        );
      } else {
        ggDealsCache.set(`${id}-${region}`, null);
      }
    }
  } catch {
    for (const id of missing) ggDealsCache.set(`${id}-${region}`, null);
  }
}
