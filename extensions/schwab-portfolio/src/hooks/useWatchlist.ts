import { useCallback } from "react";
import { useLocalStorage } from "@raycast/utils";

export function useWatchlist() {
  const { value, setValue, isLoading } = useLocalStorage<string[]>("watchlist-symbols", []);
  const symbols = value ?? [];

  const addSymbol = useCallback(
    async (symbol: string) => {
      const normalizedSymbol = symbol.trim().toUpperCase();
      if (!normalizedSymbol) return;
      await setValue(Array.from(new Set([...symbols, normalizedSymbol])).sort((a, b) => a.localeCompare(b)));
    },
    [setValue, symbols],
  );

  const removeSymbol = useCallback(
    async (symbol: string) => {
      const normalizedSymbol = symbol.trim().toUpperCase();
      await setValue(symbols.filter((savedSymbol) => savedSymbol !== normalizedSymbol));
    },
    [setValue, symbols],
  );

  return { symbols, addSymbol, removeSymbol, isLoading };
}
