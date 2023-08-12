import { useFetch } from "@raycast/utils";
import { Response } from "../types";
import { Toast, showToast } from "@raycast/api";

type Params = {
  sourceAmount: number;
  targetCurrency?: string;
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
    onError() {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: "Please check if the amount and currency are correct.",
      });
    },
  });
}

export default useWiseQuoteQuery;
