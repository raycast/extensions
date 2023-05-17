import { Cache, showHUD } from "@raycast/api";
import { useEffect } from "react";
import { getMenuBar } from "./utils";
import { MenuBar } from "./types";
import { useCachedState } from "@raycast/utils";

const MENU_BAR_CACHE_PREFIX = "menu-bar-";

export function useMenuBar(appName: string) {
  const [menuBar, setMenuBar] = useCachedState<MenuBar[]>(`${MENU_BAR_CACHE_PREFIX}${appName}`, []);

  useEffect(() => {
    if (!appName) return; // Don't fetch if appName is not defined

    async function fetchMenuBar() {
      const cache = new Cache();
      const cachedMenu = cache.get(`${MENU_BAR_CACHE_PREFIX}${appName}`);
      if (cachedMenu) {
        setMenuBar(JSON.parse(cachedMenu));
      } else {
        try {
          const menu = await getMenuBar();
          setMenuBar(menu);
          cache.set(`${MENU_BAR_CACHE_PREFIX}${appName}`, JSON.stringify(menu));
        } catch (error) {
          console.error(error);
          showHUD("Failed to get menu bar");
        }
      }
    }
    fetchMenuBar();
  }, [appName]);

  return menuBar;
}
