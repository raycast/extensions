import { Market, ParsedOutcome } from "./types";

/**
 * Extracts the first implied outcome probability (price) from a stringified array.
 * Useful for sorting or displaying the leading outcome probability of a market.
 *
 * @param outcomePrices - A JSON stringified array of outcome prices (e.g., '["0.54", "0.46"]').
 * @returns {number} The parsed probability of the first outcome, or 0 if unparseable.
 */
export const getFirstOutcomePrice = (outcomePrices: string): number => {
  try {
    const [firstPrice] = JSON.parse(outcomePrices);
    if (firstPrice === "0") return 0;
    if (firstPrice === "1") return 1;
    return Number(firstPrice) || 0;
  } catch {
    return 0;
  }
};

/**
 * Formats a given event ticker slug into a valid Polymarket web URL.
 *
 * @param tickerSlug - The overarching Event slug.
 * @returns {string} The full HTTPS url pointing to the Polymarket event page.
 */
export const getMarketUrl = (tickerSlug: string): string => {
  return `https://polymarket.com/event/${tickerSlug}/`;
};

/**
 * Safely parses the stringified arrays inside a `Market` object and zips them
 * into a typed `ParsedOutcome` array for predictable UI rendering.
 *
 * Each `Market` returns its details (labels, prices, and token IDs) as three parallel stringified arrays.
 * This helper aligns them index-by-index so components can render them synchronously.
 *
 * @param market - The raw `Market` payload from the Gamma API.
 * @returns {ParsedOutcome[]} An array of objects mapping the outcome label, its current price, and its token ID.
 */
export const parseOutcomeData = (market: Market): ParsedOutcome[] => {
  try {
    const outcomes: string[] = JSON.parse(market.outcomes);
    const outcomePrices: string[] = JSON.parse(market.outcomePrices);
    const clobTokenIds: string[] = JSON.parse(market.clobTokenIds);

    if (outcomes.length !== outcomePrices.length || outcomes.length !== clobTokenIds.length) {
      // Should not happen as these are guaranteed to be the same length.
      return [];
    }

    return outcomes.map((outcome, index) => ({
      outcome,
      outcomePrice: outcomePrices[index],
      clobTokenId: clobTokenIds[index],
    }));
  } catch (error) {
    return [];
  }
};
