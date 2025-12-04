import type { ListsResponse } from "../types/lists.dt";
import useClickUp from "./useClickUp";

function useLists(folderId: string) {
  const { isLoading, data } = useClickUp<ListsResponse>(`/folder/${folderId}/list?archived=false`);
  return { isLoading, lists: data?.lists ?? [] };
}

export { useLists };
