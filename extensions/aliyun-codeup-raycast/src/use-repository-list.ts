import { type IRepositoryListItem } from "@yuntoo/aliyun-codeup-open-api";
import { useEffect, useState } from "react";
import { cacheRepository, repository } from "./repository";

const cacheViewed = getViewed();
const cacheRepositoryList = getRepositoryList();

export function useRepositoryList() {
  const [loading, setLoading] = useState(true);
  const [viewed, setViewed] = useState(cacheViewed);
  const [repositoryList, setRepositoryList] = useState(cacheRepositoryList);

  useEffect(() => {
    repository.getRepositoryList().then((res) => {
      setRepositoryList(sortRepositoriesByViewed(res, cacheViewed));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    cacheRepository.set("viewed", JSON.stringify(viewed));
  }, [viewed]);

  useEffect(() => {
    cacheRepository.set("getRepositoryLis", JSON.stringify(repositoryList));
  }, [repositoryList]);

  return {
    loading,
    repositoryList,
    setViewed: (id: number) => {
      setViewed((prev) => [id, ...prev.filter((prevId) => id !== prevId)]);
      setRepositoryList((prev) => {
        const targetIndex = prev.findIndex((item) => item.id === id);
        if (targetIndex === -1) return prev;
        const newList = [...prev];
        const [targetItem] = newList.splice(targetIndex, 1);
        return [targetItem, ...newList];
      });
    },
  };
}

function getRepositoryList() {
  const cache = cacheRepository.get("getRepositoryLis");
  try {
    const items: IRepositoryListItem[] = cache ? JSON.parse(cache) : [];
    return items;
  } catch {
    console.log("Error parsing cached repository list");
  }
  return [];
}

function getViewed() {
  const cache = cacheRepository.get("viewed");
  try {
    const items: number[] = cache ? JSON.parse(cache) : [];
    return items;
  } catch {
    console.log("Error parsing viewed repository list");
  }
  return [];
}

// 根据viewed排序仓库列表
function sortRepositoriesByViewed(repos: IRepositoryListItem[], viewedIds: number[]) {
  return [...repos].sort((a, b) => {
    const aIndex = viewedIds.indexOf(a.id);
    const bIndex = viewedIds.indexOf(b.id);

    // 如果两个都不在viewed中，保持原顺序
    if (aIndex === -1 && bIndex === -1) return 0;

    // 如果只有a在viewed中，a排前面
    if (aIndex !== -1 && bIndex === -1) return -1;

    // 如果只有b在viewed中，b排前面
    if (aIndex === -1 && bIndex !== -1) return 1;

    // 如果两个都在viewed中，index小的排前面（越小表示越近查看过）
    return aIndex - bIndex;
  });
}
