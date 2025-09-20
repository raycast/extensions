import { SourceName, UseSource } from "@/types";
import { useBybit } from "./useBybit";
import { useOKX } from "./useOKX";

export const sourceNames = ["OKX", "Bybit"] as const;

const sources: Record<SourceName, UseSource> = {
  OKX: useOKX,
  Bybit: useBybit,
};

export function useSource(name: string, ...args: Parameters<UseSource>) {
  const source = sources[name as SourceName];
  if (!source) {
    throw new Error(`Invalid source '${source}'`);
  }
  return source(...args);
}
