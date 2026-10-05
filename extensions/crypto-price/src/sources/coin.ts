import { Coin } from "#/types";
import { COINS } from "#/constants";
import { formatCurrency } from "#/utils";

/** Build a normalized Coin, deriving the display name and formatting the price honestly. */
export function makeCoin(args: {
  symbol: string;
  price: number;
  high24h: number;
  low24h: number;
  quoteCurrency: string;
  more?: Record<string, string>;
}): Coin {
  const { symbol, price, high24h, low24h, quoteCurrency, more = {} } = args;
  return {
    name: COINS[symbol]?.name ?? symbol,
    symbol,
    price,
    high24h,
    low24h,
    quoteCurrency,
    priceDisplay: formatCurrency(price, quoteCurrency),
    more,
  };
}
