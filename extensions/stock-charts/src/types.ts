export const INTERVALS = [
  "1D",
  "1W",
  "1M",
  "3M",
  "6M",
  "YTD",
  "1Y",
  "2Y",
  "5Y",
] as const;
export type Interval = (typeof INTERVALS)[number];
