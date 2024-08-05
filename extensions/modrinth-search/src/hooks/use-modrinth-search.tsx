import { showFailureToast, useFetch } from "@raycast/utils";
import { BASE_URL } from "../utils/constants";
import { useEffect, useState } from "react";
import { useDebounce } from "../utils/use-debounce";

type SearchResponse = {
  hits: ListModrinthProject[];
  offset: number;
  limit: number;
  total_hits: number;
};

type ModrinthProjectType = "mod" | "plugin" | "modpack" | "resourcepack" | "datapack" | "shader";

export type ListModrinthProject = {
  slug: string;
  title: string;
  project_type: ModrinthProjectType;
  author: string;
  icon_url?: string;
  downloads: number;
  follows: number;
};

type UseProjectReturn = {
  data: ListModrinthProject[];
  isLoading: boolean;
  handleSearchChange: (query: string | undefined) => void;
  onLoadMore: () => void;
  pagination: {
    pageSize: number;
    hasMore: boolean;
  };
};

const PROJECT_LIMIT = 20;

/**
 * A hook that contains all logic for fetching and mapping modrinth projects on the search endpoint.
 */
export const useModrinthSearch = (): UseProjectReturn => {
  const [searchQuery, setSearchQuery] = useState<string | undefined>();
  const [offset, setOffset] = useState<number>(0);
  const [projects, setProjects] = useState<ListModrinthProject[]>([]);

  const { isLoading, error, pagination, mutate } = useFetch<unknown, ListModrinthProject[], ListModrinthProject[]>(
    () => {
      const urlParams = new URLSearchParams({
        limit: PROJECT_LIMIT.toString(),
      });

      if (searchQuery) {
        urlParams.set("query", searchQuery);
      }

      urlParams.set("offset", offset.toString());

      return `${BASE_URL}/search?${urlParams.toString()}`;
    },
    {
      cache: "default",
      headers: {
        "Content-Type": "application/json",
      },
      mapResult: (result) => {
        if (isListModrinthProjectArray(result)) {
          setProjects((prev) => {
            prev.push(...result.hits);
            return prev;
          });
          return {
            data: result.hits,
            hasMore: result.total_hits > result.offset + PROJECT_LIMIT,
            cursor: result.offset,
          };
        }
        return { data: [], hasMore: false, cursor: 0 };
      },
      keepPreviousData: true,
      initialData: [],
    },
  );

  const handleSearchChange = (query: string | undefined) => {
    setOffset(0);
    setProjects([]);
    setSearchQuery(query);
  };

  const debouncedSearchChnage = useDebounce((query: string | undefined) => handleSearchChange(query), 300);

  const handleLoadMore = () => {
    setOffset(offset + PROJECT_LIMIT);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    mutate();
  }, [offset]);

  if (error) {
    showFailureToast(error.message);
  }

  return {
    data: projects,
    isLoading,
    handleSearchChange: debouncedSearchChnage,
    onLoadMore: handleLoadMore,
    pagination: {
      pageSize: pagination?.pageSize ?? 0,
      hasMore: pagination?.hasMore ?? false,
    },
  };
};

const isListModrinthProjectArray = (result: unknown): result is SearchResponse => {
  return (
    typeof result === "object" &&
    result !== null &&
    "hits" in result &&
    Array.isArray(result.hits) &&
    result.hits.length > 0 &&
    "slug" in result.hits[0]
  );
};
