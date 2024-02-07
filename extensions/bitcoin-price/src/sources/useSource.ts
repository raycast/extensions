import { useCryptoCompare } from "./useCryptoCompare";
import { useBinanceSpot, useBinanceFutures } from "./useBinance";
import { SourceName, UseSource } from "#/types";

export const sourceNames = ["CryptoCompare", "BinanceSpot", "BinanceFutures"] as const;

const sources: Record<SourceName, UseSource> = {
  CryptoCompare: useCryptoCompare,
  BinanceSpot: useBinanceSpot,
  BinanceFutures: useBinanceFutures,
};

export function useSource(name: string, ...args: Parameters<UseSource>) {
  const source = sources[name as SourceName];
  if (!source) {
    throw new Error(`Invalid source '${source}'`);
  }
  return source(...args);
}
