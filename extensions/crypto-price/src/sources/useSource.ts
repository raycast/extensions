import { useCryptoCompare } from "./useCryptoCompare";
import { useBinance } from "./useBinance";
import { SourceName, UseSource } from "#/types";

export const sourceNames = ["CryptoCompare", "Binance"] as const;

const sources: Record<SourceName, UseSource> = {
  CryptoCompare: useCryptoCompare,
  Binance: useBinance,
};

export function useSource(name: string, ...args: Parameters<UseSource>) {
  const source = sources[name as SourceName];
  if (!source) {
    throw new Error(`Invalid source '${source}'`);
  }
  return source(...args);
}
