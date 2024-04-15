import { useFetch } from "@raycast/utils";
import { SuccessResponse } from "../types";
import { API_HEADERS, API_URL } from "../constants";
import { Toast, showToast } from "@raycast/api";
import { useState } from "react";

type HookOptions<T> = {
  onData?: (data: T[]) => void;
};
export function useLOTR<T>(endpoint: string, pluralItem = "", paramString?: string, hookOptions?: HookOptions<T>) {
  const [totalItems, setTotalItems] = useState(0);

  const { isLoading, data, error, pagination } = useFetch(
    (options) =>
      API_URL +
      endpoint +
      "?" +
      new URLSearchParams({ page: String(options.page + 1) }).toString() +
      (paramString ? `&${paramString}` : ""), //used for filters e.g. we might get race=Hobbit
    {
      headers: API_HEADERS,
      async onWillExecute() {
        await showToast({
          title: `Fetching ${pluralItem}`,
          style: Toast.Style.Animated,
        });
      },
      async onData(data: T[]) {
        await showToast({
          title: `Fetched ${data.length} ${pluralItem}`,
          style: Toast.Style.Success,
        });
        hookOptions?.onData?.(data);
      },
      mapResult(result: SuccessResponse<T>) {
        if (!totalItems) setTotalItems(result.total);
        return {
          data: result.docs,
          hasMore: result.page < result.pages,
        };
      },
    },
  );

  return { isLoading, data, error, pagination, totalItems };
}
