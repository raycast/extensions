import type { ListsResponse } from "../types/lists.dt";
import useClickUp from "./useClickUp";

function useFolderlessTaskList(spaceId: string) {
  const { isLoading, data } = useClickUp<ListsResponse>(`/space/${spaceId}/list?archived=false`);
  return { isLoading, lists: data?.lists ?? [] };
}

export { useFolderlessTaskList };
