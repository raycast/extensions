import { useCachedPromise } from "@raycast/utils";
import { getAllTabs, Tab } from "../utils/tabs-helper";

/**
 * 获取浏览器标签页的 React Hook
 */
export function useBrowserTabs() {
  return useCachedPromise(
    async (): Promise<Tab[]> => {
      return await getAllTabs();
    },
    [],
    {
      keepPreviousData: true,
    },
  );
}
