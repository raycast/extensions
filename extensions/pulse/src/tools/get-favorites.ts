import { loadFavorites } from "../lib/favorites";
import { fetchRows } from "../lib/quotes";
import { instrumentCurrency } from "../lib/symbols";
import { describeInstrument } from "../lib/tool-support";

/**
 * The person's favorite symbols in Pulse, in their order, with each one's latest price and change.
 * The first favorite is the one shown in the menu bar.
 */
export default async function tool() {
  const favorites = await loadFavorites();
  if (favorites.length === 0) return { favorites: [], note: "The person has no favorites yet." };
  let rows: Awaited<ReturnType<typeof fetchRows>> | null = null;
  let pricingError: string | undefined;
  try {
    rows = await fetchRows(favorites.map((favorite) => favorite.symbol));
  } catch (error) {
    pricingError = error instanceof Error ? error.message : String(error);
  }
  return {
    favorites: favorites.map((favorite) => {
      const row = rows?.quotes[favorite.symbol];
      return {
        ...describeInstrument(favorite),
        price: row?.price ?? null,
        currency: row?.currency ?? instrumentCurrency(favorite),
        changePercent: row?.changePercent === null || !row ? null : Number(row.changePercent.toFixed(2)),
      };
    }),
    // List prices carry no session or delay; get-quotes has them.
    freshness:
      "These prices follow each exchange's delay and may be from a closed market. Call get-quotes for the symbols you discuss to get their session, delay and last trade time.",
    note:
      pricingError ??
      (rows?.failed.length ? `${rows.failed.join(" and ")} did not answer, so some prices are missing.` : undefined),
  };
}
