import { useFetch } from "@raycast/utils";
import { Response } from "../types";
import { Toast, openExtensionPreferences, showToast } from "@raycast/api";

type Params = {
  sourceAmount: number;
  targetCurrency?: string;
};

export type Error = {
  code: "CurrencyCode";
  message: string;
  path: string;
};

type ErrorResponse = {
  errors: Error[];
};

const defaultParams = {
  preferredPayIn: "DIRECT_DEBIT",
  sourceCurrency: "USD",
  targetCurrency: "MXN",
};

function useWiseQuoteQuery({ sourceAmount, targetCurrency = "MXN" }: Params) {
  return useFetch<Response>("https://wise.com/gateway/v3/quotes", {
    keepPreviousData: true,
    body: JSON.stringify({
      ...defaultParams,
      targetCurrency,
      sourceAmount,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    parseResponse: async (response) => {
      if (!response.ok) {
        const error = await response.text();
        const parsedError = JSON.parse(error) as ErrorResponse;
        const errorMessage = parsedError.errors?.[0];
        return Promise.reject(errorMessage);
      }
      return await response.json();
    },
    onError(error) {
      const apiError = error as unknown as Error;
      if (apiError.code === "CurrencyCode") {
        showToast({
          style: Toast.Style.Failure,
          title: apiError.message,
          message: "Please check your currency code",
          primaryAction: {
            title: "Update target currency",
            onAction: () => {
              openExtensionPreferences();
            },
          },
        });
        return;
      }
      showToast({
        style: Toast.Style.Failure,
        title: error?.message || "Something went wrong",
      });
    },
  });
}

export default useWiseQuoteQuery;
