import { formatBybitResponse } from "@/helpers";
import { BybitResponse } from "@/types";
import { useFetch } from "@raycast/utils";

export const useBybit = () => {
  const url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=TONUSDT`;
  const { isLoading, data, error } = useFetch<unknown, unknown, BybitResponse>(url, { keepPreviousData: true });

  if (isLoading) {
    return { isLoading, data: undefined, error };
  }

  if (data?.retCode !== 0) {
    return { isLoading, data: undefined, error: new Error(data?.retMsg) };
  }

  return { isLoading, data: formatBybitResponse(data), error };
};
