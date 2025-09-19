import { usePromise } from "@raycast/utils";
import { useDebounce } from "./useDebounce";
import { searchWithSpotlight } from "../utils/spotlight";
import { searchWithFd } from "../utils/fd";
import { getPreferenceValues } from "@raycast/api";
import { FileResult, SearchMode, Preferences } from "../types";
import { useState, useCallback, useEffect } from "react";

export function useFileSearch(query: string, mode: SearchMode) {
  const debouncedQuery = useDebounce(query, mode === "spotlight" ? 300 : 0); // fd模式不需要防抖
  const preferences = getPreferenceValues<Preferences>();
  const [manualTrigger, setManualTrigger] = useState(0);
  const [lastQuery, setLastQuery] = useState("");
  const [currentSearchQuery, setCurrentSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [hasPreviousResults, setHasPreviousResults] = useState(false);

  // 当模式改变或查询改变时，重置手动触发状态
  useEffect(() => {
    if (mode === "fd" && query !== lastQuery) {
      setManualTrigger(0);
      setLastQuery(query);
    }
  }, [mode, query, lastQuery]);

  // 手动触发搜索的函数
  const triggerSearch = useCallback(() => {
    console.log("Triggering search for:", query);
    setIsSearching(true);
    setCurrentSearchQuery(query); // 立即使用当前查询
    // 稍微延迟触发，确保状态先更新
    setTimeout(() => {
      setManualTrigger((prev) => prev + 1);
    }, 10);
  }, [query]);

  const searchResult = usePromise(
    async (searchQuery: string, searchMode: SearchMode, trigger: number) => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        return [];
      }

      let results: FileResult[] = [];

      if (searchMode === "spotlight") {
        // Spotlight 搜索自动触发（快速）
        results = await searchWithSpotlight(
          searchQuery,
          100,
          preferences.searchPath,
        );
      } else {
        // fd 搜索只在手动触发时执行（性能考虑）
        if (trigger === 0) {
          // fd 模式必须手动触发，不自动执行搜索
          return [];
        }

        // 添加人工延迟，让用户看到搜索状态
        await new Promise((resolve) => setTimeout(resolve, 100));

        results = await searchWithFd(searchQuery, {
          path: preferences.searchPath,
          maxDepth: parseInt(preferences.maxDepth),
          hidden: preferences.showHiddenFiles,
          exclude: preferences.excludePatterns
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
        });
      }

      // 按修改时间排序
      return results.sort(
        (a, b) => b.modifiedDate.getTime() - a.modifiedDate.getTime(),
      );
    },
    [mode === "fd" ? currentSearchQuery : debouncedQuery, mode, manualTrigger],
    {
      execute:
        (mode === "spotlight" && debouncedQuery.length >= 2) ||
        (mode === "fd" && manualTrigger > 0 && currentSearchQuery.length >= 2),
      keepPreviousData: true, // 总是保留旧数据，直到新搜索完成
      onError: (error) => {
        console.error("Search error:", error);
        if (mode === "fd") {
          setIsSearching(false);
        }
      },
    },
  );

  // 监控搜索完成状态
  useEffect(() => {
    if (mode === "fd" && !searchResult.isLoading && isSearching) {
      console.log("Search completed, resetting isSearching");
      setIsSearching(false);
    }
  }, [mode, searchResult.isLoading, isSearching]);

  // 跟踪是否有搜索结果
  useEffect(() => {
    if (searchResult.data && searchResult.data.length > 0) {
      setHasPreviousResults(true);
    } else if (mode === "spotlight" || manualTrigger === 0) {
      // Only reset when switching to spotlight or when completely reset
      setHasPreviousResults(false);
    }
  }, [searchResult.data, mode, manualTrigger]);

  const isReallyLoading =
    searchResult.isLoading || (mode === "fd" && isSearching);

  console.log("Search state:", {
    isLoading: searchResult.isLoading,
    isSearching,
    isReallyLoading,
    mode,
    manualTrigger,
  });

  return {
    ...searchResult,
    isLoading: isReallyLoading,
    triggerSearch,
    isManualMode: mode === "fd" && manualTrigger === 0,
    needsManualTrigger:
      mode === "fd" && manualTrigger === 0 && !hasPreviousResults,
  };
}
