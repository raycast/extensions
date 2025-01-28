import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { BASE_URL, getAuthHeaders, PageStatusResponse } from "../utils";

export function usePageStatus(pageId: number) {
  const { clientId, accessToken } = getPreferenceValues<Preferences>();

  return useFetch(`${BASE_URL}/pages/${pageId}/status`, {
    method: "GET",
    headers: getAuthHeaders(clientId, accessToken),
    keepPreviousData: true,
    mapResult(rawResponse: PageStatusResponse) {
      return {
        data: rawResponse.data,
      };
    },
  });
}
