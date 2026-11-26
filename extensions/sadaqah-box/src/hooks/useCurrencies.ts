import { useCachedPromise } from "@raycast/utils";
import { showToast, Toast } from "@raycast/api";
import { listCurrenciesCached } from "../api/cached";
import { getErrorMessage } from "../utils/error-handler";
import type { Currency } from "../types";

/**
 * Shared hook to load and cache available currencies with toast error reporting
 */
export function useCurrencies() {
  return useCachedPromise(
    async (): Promise<Currency[]> => {
      const response = await listCurrenciesCached();
      return response.currencies;
    },
    [],
    {
      initialData: [] as Currency[],
      onError(error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load currencies",
          message: getErrorMessage(error),
        });
      },
    },
  );
}
