import { useFetch } from "@raycast/utils";
import { endpoint, headers, parseResponse, TagWithCounts } from "./screvi";

/** Every tag you own, name-sorted, with highlight and article counts. */
export function useTags() {
  return useFetch(endpoint("/tags"), {
    headers: headers(),
    parseResponse: (response) => parseResponse<{ data: TagWithCounts[] }>(response),
    mapResult: (result) => ({ data: result.data }),
    initialData: [] as TagWithCounts[],
    keepPreviousData: true,
    failureToastOptions: { title: "Could not load tags" },
  });
}
