import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

import { getList } from "@/api/list";
import { ListObject } from "@/types/list";
import { CachedPromiseOptionsType } from "@/types/utils";

type Props = {
  options?: CachedPromiseOptionsType<Awaited<ReturnType<typeof getList>>>;
};

export default function useLists({ options }: Props = {}) {
  const { data, error, isLoading, mutate } = useCachedPromise(getList, [], {
    ...options,
  });

  const { all, lists, smartLists, trash } = useMemo(() => {
    const all = data?.list?.filter((list) => list.archivedAt === null).sort(sortByDate());

    const lists = data?.list?.filter((list) => list.type === "list" && list.archivedAt === null).sort(sortByDate());

    const smartLists = data?.list
      ?.filter((list) => list.type === "smartlist" && list.archivedAt === null)
      .sort(sortByDate());

    const trash = data?.list?.find((list) => list.name === "trash");

    return { all, lists, smartLists, trash };
  }, [data]);

  return {
    listsData: all,
    lists,
    smartLists,
    trash,
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
