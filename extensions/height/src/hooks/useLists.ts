import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { ApiHeaders, ApiUrls } from "../api/helpers";
import { ListObject } from "../types/list";
import { ApiResponse } from "../types/utils";

export default function useLists() {
  const { data, error, isLoading, mutate } = useFetch<ApiResponse<ListObject>>(ApiUrls.lists, {
    headers: ApiHeaders,
  });

  const { all, lists, smartLists } = useMemo(() => {
    const all = data?.list?.filter((list) => list.archivedAt === null).sort(sortByDate());

    const lists = data?.list?.filter((list) => list.type === "list" && list.archivedAt === null).sort(sortByDate());

    const smartLists = data?.list
      ?.filter((list) => list.type === "smartlist" && list.archivedAt === null)
      .sort(sortByDate());

    return { all, lists, smartLists };
  }, [data]);

  return {
    listsData: all,
    lists,
    smartLists,
    listsError: error,
    listsIsLoading: isLoading,
    listsMutate: mutate,
  };
}
function sortByDate(direction: "asc" | "desc" = "asc") {
  return (a: ListObject, b: ListObject) => {
    return direction === "asc"
      ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  };
}
