import { useMemo } from "react";

import { useFetch } from "@raycast/utils";

import type { GeneralSearchResult, Language, Post, Profile, UseSearch } from "@/types";
import { SearchType } from "@/types";

const BASEURL = "https://substack.com/api/v1";

export default function useSearchApi<T extends Post | Profile>(
  type: SearchType,
  query: string,
  language?: Language,
): UseSearch<T> {
  const extraParams: Record<string, unknown> = useMemo(() => {
    const languageParam = language && language.length > 0 ? { language } : {};
    switch (type) {
      case SearchType.Posts:
        return { includePlatformResults: true, ...languageParam };
      case SearchType.Profiles:
        return { ...languageParam };
    }
  }, [type, language]);

  const { isLoading, data, pagination } = useFetch(
    (options) => {
      const url =
        `${BASEURL}/${type}/search?` +
        new URLSearchParams({ page: String(options.page), query, ...extraParams }).toString();
      return url;
    },
    {
      mapResult(res: GeneralSearchResult<T>) {
        const data = res.results.map((item) => ({
          ...item,
          _id: `${item.id}_${item.slug}`,
        }));

        return {
          data,
          // Note: The API does seem to work with pagination, but somehow it always returns the same results. Disabling pagination for now.
          hasMore: false,
        };
      },
      keepPreviousData: false,
      initialData: [],
      execute: query !== "",
    },
  );

  // Remove duplicates and make empty when query is empty
  const filteredData =
    query === "" ? [] : data.filter((item, index, self) => self.findIndex((t) => t._id === item._id) === index);

  return { isLoading, data: filteredData, pagination };
}
