import { formatOKXResponse } from "@/helpers";
import { OKXResponse } from "@/types";
import { useFetch } from "@raycast/utils";

export const useOKX = () => {
  const url = `https://www.okx.com/api/v5/market/ticker?instId=TON-USDT`;
  const { isLoading, data, error } = useFetch<unknown, unknown, OKXResponse>(url, { keepPreviousData: true });

  if (isLoading) {
    return { isLoading, data: undefined, error };
  }

  if (data?.code !== "0") {
    return { isLoading, data: undefined, error: new Error(data?.msg) };
  }

  return { isLoading, data: formatOKXResponse(data), error };
};
