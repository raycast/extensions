import { useSortedMenuBarIds } from "./useMenuBarIds";
import { usePinned } from "./usePinned";

export function usePinnedMenuBarIds() {
  const menuBarItemsHook = useSortedMenuBarIds();
  const { pinned, ...pinnedFunctions } = usePinned("menu-bar-ids");
  const unpinned = menuBarItemsHook.data?.filter((item) => !pinned.includes(item)) || [];

  return {
    pinned,
    unpinned,
    isLoading: menuBarItemsHook.isLoading,
    error: menuBarItemsHook.error,
    clearCache: menuBarItemsHook.clearCache,
    visitItem: menuBarItemsHook.visitItem,
    resetRanking: menuBarItemsHook.resetRanking,
    pinnedFunctions,
    isRunning: (menuBarId: string) => menuBarItemsHook.data?.includes(menuBarId) ?? false,
  };
}
