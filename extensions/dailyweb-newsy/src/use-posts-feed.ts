import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { groupByDate } from "./categories";
import { BASE_URL } from "./constants";
import type { AuthorFilter, Post } from "./types";

export function usePostsFeed() {
  const { postsPerPage } = getPreferenceValues<Preferences>();
  const [categoryId, setCategoryId] = useState("0");
  const [searchText, setSearchText] = useState("");
  const [authorFilter, setAuthorFilter] = useState<AuthorFilter | null>(null);
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setPage(1);
    setAllPosts([]);
  }, [categoryId, searchText, authorFilter?.id, refreshKey]);

  const buildUrl = () => {
    const p = new URLSearchParams({
      _embed: "1",
      per_page: postsPerPage,
      page: String(page),
    });
    if (categoryId !== "0") p.set("categories", categoryId);
    if (authorFilter) p.set("author", String(authorFilter.id));
    else if (searchText) p.set("search", searchText);
    return `${BASE_URL}/wp-json/wp/v2/posts?${p.toString()}`;
  };

  const {
    data: newPosts,
    isLoading,
    error,
  } = useFetch<Post[]>(buildUrl(), {
    keepPreviousData: false,
  });

  useEffect(() => {
    if (!newPosts) return;
    if (page === 1) {
      setAllPosts(newPosts);
    } else {
      setAllPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...newPosts.filter((p) => !seen.has(p.id))];
      });
    }
    setHasMore(newPosts.length === Number(postsPerPage));
  }, [newPosts, page, postsPerPage]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const onSearchTextChange = useCallback((text: string) => {
    setAuthorFilter(null);
    setSearchText(text);
  }, []);

  const useGroups = !searchText && !authorFilter;
  const groups = groupByDate(allPosts);

  return {
    categoryId,
    setCategoryId,
    searchText,
    authorFilter,
    setAuthorFilter,
    allPosts,
    hasMore,
    isLoading,
    error,
    setPage,
    refresh,
    onSearchTextChange,
    useGroups,
    groups,
  };
}
