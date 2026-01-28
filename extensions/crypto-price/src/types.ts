import { sourceNames } from "#/sources/useSource";

export interface Perferences {
  source: string;
  currency: string;
  style: string;
  coins: string;
}

export interface Coin {
  name: string;
  symbol: string;
  price: number;
  high24h: number;
  low24h: number;
  priceDisplay: string;
  more: Record<string, string>;
}

export type SourceName = (typeof sourceNames)[number];

export type UseSource = (
  currency: string,
  symbols: string[]
) => { isLoading: boolean; coins: Record<string, Coin> | undefined };
