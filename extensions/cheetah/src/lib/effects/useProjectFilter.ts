// 查找与关键词匹配的项目
import { useState } from "react";
import { Project, filterWithSearchResult, filterWithCache } from "cheetah-core";
import { refreshKeyword } from "../constant";
import { ResultItem } from "../types";
import { output } from "../core";
import { environment } from "@raycast/api";
import { errorHandle } from "../utils";

export default (): [
  ResultItem[],
  boolean,
  (keyword: string) => Promise<void>
] => {
  const [resultList, setResultList] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * @description: 查找项目
   * @param {string} keyword 用户输入的关键词
   * @return {*}
   */
  async function filterProject(keyword: string): Promise<void> {
    try {
      const needRefresh: boolean = keyword.includes(refreshKeyword);
      const searchKeyword = keyword.replace(refreshKeyword, "");
      setLoading(true);
      let projects: Project[] = await filterWithCache(searchKeyword);
      let fromCache = true;
      // 如果缓存结果为空或者需要刷新缓存，则重新搜索
      if (!projects.length || needRefresh) {
        projects = await filterWithSearchResult(searchKeyword);
        fromCache = false;
      }

      const result: ResultItem[] = await output(projects);

      if (fromCache) {
        result.push({
          name: "Ignore cache re search",
          description:
            "Ignore the cache and search for items in the working directory again",
          icon: `${environment.assetsPath}/refresh.png`,
          arg: searchKeyword,
          refresh: true,
        });
      }

      setResultList(result);
      setLoading(false);
    } catch (error: unknown) {
      errorHandle(error);
    }
  }

  return [resultList, loading, filterProject];
};
