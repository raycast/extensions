export const INTERVALS = ["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"] as const;
export type Interval = (typeof INTERVALS)[number];
