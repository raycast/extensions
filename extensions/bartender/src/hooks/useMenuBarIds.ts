import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { clearMenuBarDetailCache, fetchMenuBarIdsFromBartender } from "../api";

export function useMenuBarIds() {
  const menuBarItemsHook = useCachedPromise(fetchMenuBarIdsFromBartender);
  const data = menuBarItemsHook.data?.status === "success" ? menuBarItemsHook.data.data : undefined;
  const error = menuBarItemsHook.data?.status === "error" ? menuBarItemsHook.data.error : undefined;
  const isLoading = menuBarItemsHook.isLoading;
  return {
    data,
    error,
    isLoading,
    clearCache: () => {
      clearMenuBarDetailCache();
      menuBarItemsHook.revalidate();
    },
  };
}

export function useSortedMenuBarIds() {
  const menuBarItemsHook = useMenuBarIds();
  const sortedHook = useFrecencySorting(menuBarItemsHook.data, {
    namespace: "menu-bar-items",
    key: (item) => item,
  });

  return {
    ...menuBarItemsHook,
    data: sortedHook.data,
    visitItem: sortedHook.visitItem,
    resetRanking: sortedHook.resetRanking,
  };
}
