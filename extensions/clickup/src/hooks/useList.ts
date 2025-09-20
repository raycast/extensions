import type { List } from "../types/lists.dt";
import useClickUp from "./useClickUp";

function useList(listId: string) {
  const { isLoading, data } = useClickUp<List>(`/list/${listId}`);
  return { isLoading, list: data };
}

export { useList };
