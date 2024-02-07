import { sourceNames } from "#/sources/useSource";

export interface Perferences {
  source: string;
  currency: string;
  style: string;
}

export interface Data {
  basic: {
    price: number;
    high24h: number;
    low24h: number;
  };
  more: Record<string, string>;
}

export type SourceName = typeof sourceNames[number];

export type UseSource = (currency: string) => { isLoading: boolean; data: Data | undefined };
