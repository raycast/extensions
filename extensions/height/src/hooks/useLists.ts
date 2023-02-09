import { useFetch } from "@raycast/utils";
import { ApiHeaders, ApiUrls } from "../api/helpers";
import { ApiListResponse } from "../types/list";

export default function useLists() {
  const { data, error, isLoading, mutate } = useFetch<ApiListResponse>(ApiUrls.lists, {
    headers: ApiHeaders,
  });

  return {
    listsData: data?.list,
    listsError: error,
    listsIsLoading: isLoading,
    listsMutate: mutate,
  };
}
