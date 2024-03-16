import { sourceNames } from "#/sources/useSource";

export interface IsCoinEnabled {
  isETHEnabled: boolean;
  isBNBEnabled: boolean;
  isSOLEnabled: boolean;
  isXRPEnabled: boolean;
}

export interface Perferences extends IsCoinEnabled {
  source: string;
  currency: string;
  style: string;
}

export interface Coin {
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
  coinSymbols: string[]
) => { isLoading: boolean; coins: Record<string, Coin> | undefined };
