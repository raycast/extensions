import { useEffect, useState } from "react";
import { fetchFinancialDetails, FinancialDetails } from "./yahoo-finance";

export function useFinancialDetails(symbols: string[]) {
  const [details, setDetails] = useState<Map<string, FinancialDetails>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const key = [...symbols].sort().join(",");

  useEffect(() => {
    if (symbols.length === 0) {
      setDetails(new Map());
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    Promise.all(
      symbols.map(async (symbol) => {
        const result = await fetchFinancialDetails(symbol, controller.signal);
        return [symbol, result] as const;
      }),
    )
      .then((results) => {
        const map = new Map<string, FinancialDetails>();
        for (const [symbol, result] of results) {
          if (result) map.set(symbol, result);
        }
        setDetails(map);
        setIsLoading(false);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [key]);

  return { details, isLoading };
}
