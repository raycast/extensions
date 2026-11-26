import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listCurrenciesCached } from "../api/cached";
import type { Currency } from "../types";

/**
 * Shared hook to load and cache available currencies scoped per API host
 */
export function useCurrencies() {
  const { apiHost } = getPreferenceValues<{ apiHost?: string }>();
  const hostScope = apiHost?.trim() || "";

  return useCachedPromise(
    async (host: string): Promise<Currency[]> => {
      void host;
      const response = await listCurrenciesCached();
      return response.currencies;
    },
    [hostScope],
    {
      initialData: [] as Currency[],
      failureToastOptions: {
        title: "Failed to load currencies",
      },
    },
  );
}
