import { getCurrency } from "./preference";

// ['1m', '5m', '15m', '30m', '1h', '3h', '6h', '12h', '1D', '1W', '14D', '1M']
export const tfOptions = [
  ["1m", "1 min"],
  ["5m", "5 min"],
  ["15m", "15 min"],
  ["30m", "30 min"],
  ["1h", "1 hour"],
  ["3h", "3 hours"],
  ["6h", "6 hours"],
  ["12h", "12 hours"],
  ["1D", "1 day"],
  ["1W", "1 week"],
  ["14D", "2 weeks"],
  ["1M", "1 month"],
];

export const tfKeyToLabel: Record<string, string> = tfOptions.reduce((acc, [key, label]) => {
  return {
    ...acc,
    [key]: label,
  };
}, {});

export const candlesTimeFrame: Record<string, string> = tfOptions.reduce(
  (acc, tf) => ({
    ...acc,
    [tf[0]]: `https://api-pub.bitfinex.com/v2/candles/trade:${tf[0]}:${getCurrency()}:a30:p2:p30/hist`,
  }),
  {}
);
