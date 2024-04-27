import { useFetch } from "@raycast/utils";
import { SuccessResponse } from "../types";
import { API_HEADERS, API_URL } from "../constants";
import { Toast, showToast } from "@raycast/api";

export function usePotterDB<T>(endpoint: string, pluralItem = "") {
    const { isLoading, data, pagination } = useFetch(
        (options) =>
            API_URL + endpoint + "?" +
        `page[number]=${options.page + 1}`, {
         headers: API_HEADERS,
      async onWillExecute() {
        await showToast({
          title: `Fetching ${pluralItem}`,
          style: Toast.Style.Animated,
        });
      },
      mapResult(result: SuccessResponse<T>) {
        return {
            data: result.data,
            hasMore: ("next" in result.meta.pagination),
        };
      },
    async onData(data: T[]) {
        await showToast({
          title: `Fetched ${data.length} ${pluralItem}`,
          style: Toast.Style.Success,
        });
      },
    });

    return { isLoading, data, pagination };
}