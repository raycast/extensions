import { usePromise } from "@raycast/utils";
import { fetchAllMenuBarDetail } from "../api";
import { useSortedMenuBarIds } from "./useMenuBarIds";

export function useMenuBarDetails() {
  const menuBarIdsHook = useSortedMenuBarIds();
  const itemsHook = usePromise(fetchAllMenuBarDetail, [menuBarIdsHook.data], {
    execute: !!menuBarIdsHook.data,
  });
  return {
    ...menuBarIdsHook,
    data: itemsHook.data,
    isLoading: menuBarIdsHook.isLoading || itemsHook.isLoading,
    error: menuBarIdsHook.error || itemsHook.error,
  };
}
