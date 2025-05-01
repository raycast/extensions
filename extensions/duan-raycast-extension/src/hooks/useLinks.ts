import { useCachedPromise } from "@raycast/utils";
import { getLinks } from "../services/api";
import type { Link } from "../types";

/**
 * useCachedPromise 工作流程：
 *
 * 1. 首次调用时：
 *    1.1 返回 initialData (空数组)
 *    1.2 设置 isLoading 为 true
 *    1.3 执行异步函数获取数据
 *    1.4 缓存获取到的数据
 *    1.5 更新组件状态
 *
 * 2. 后续访问时：
 *    2.1 立即返回缓存的数据
 *    2.2 在后台重新获取新数据 (stale-while-revalidate)
 *    2.3 获取到新数据后更新缓存和状态
 */
export function useLinks() {
  return useCachedPromise(
    // The async function to fetch data
    async () => {
      const links = await getLinks();
      return links;
    },
    // Dependencies array - empty because we don't have any dependencies
    [],
    {
      // Return initialData(empty array) when initial call
      initialData: [] as Link[],
    },
  );
}
