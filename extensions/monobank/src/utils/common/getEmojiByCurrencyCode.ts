import { currencyCodesToEmoji } from "../../data/currency-data";

export function getEmojiByCurrencyCode(currencyCode: string) {
  if (!currencyCode) {
    return null;
  }

  return currencyCodesToEmoji[currencyCode.toUpperCase()] || "";
}
