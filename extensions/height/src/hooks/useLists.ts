import { useFetch } from "@raycast/utils";
import { ApiHeaders, ApiUrls } from "../api/helpers";
import { ListObject } from "../types/list";
import { ApiResponse } from "../types/utils";

export default function useLists() {
  const { data, error, isLoading, mutate } = useFetch<ApiResponse<ListObject>>(ApiUrls.lists, {
    headers: ApiHeaders,
  });

  return {
    listsData: data?.list,
    listsError: error,
    listsIsLoading: isLoading,
    listsMutate: mutate,
  };
}
