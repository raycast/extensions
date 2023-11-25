import { showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { AbortError } from "node-fetch";
import { apiRequest } from "@/functions/apiRequest";

export const useSearch = <T extends "collections" | "photos">(
  type: T,
  orientation: "all" | "landscape" | "portrait" | "squarish"
) => {
  const [state, setState] = useState<SearchState<T>>({ results: [], isLoading: true });
  const [lastSearch, setLastSearch] = useState("");
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");

    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (lastSearch === "") return;
    search(lastSearch);
  }, [orientation]);

  const search = async (searchText: string) => {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();

    try {
      if (searchText === "") {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        return;
      }

      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));

      const { errors, results } = (await performSearch({
        signal: cancelRef.current?.signal,

        // Text
        searchText,

        // Options
        options: {
          orientation,
          type: type || "photos",
        },
      })) as {
        errors?: string[];
        results: T extends "collections" ? CollectionResult[] : SearchResult[];
      };

      if (errors?.length) {
        showToast(Toast.Style.Failure, `Failed to fetch ${type}.`, errors?.join("\n"));
      }

      setLastSearch(searchText);

      setState((oldState) => ({
        ...oldState,
        isLoading: false,
        results: results || [],
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }

      showToast(Toast.Style.Failure, "Could not perform search", String(error));
    }
  };

  return {
    state,
    search,
  };
};

// Perform Search
interface PerformSearchProps {
  signal: AbortSignal;
  searchText: string;
  options: {
    orientation: "all" | "landscape" | "portrait" | "squarish";
    type: "photos" | "collections";
  };
}

type SearchOrCollectionResult<T extends PerformSearchProps> = T extends { options: { type: "collections" } }
  ? CollectionResult[]
  : SearchResult[];

export const performSearch = async <T extends PerformSearchProps>({
  searchText,
  options,
  signal,
}: PerformSearchProps): Promise<{ errors?: string[]; results: SearchOrCollectionResult<T> }> => {
  const searchParams = new URLSearchParams({
    page: "1",
    query: searchText,
    per_page: "30",
  });

  if (options.orientation !== "all") searchParams.append("orientation", options.orientation);

  const { errors, results } = await apiRequest<{ errors?: string[]; results: SearchOrCollectionResult<T> }>(
    `/search/${options.type}?${searchParams.toString()}`,
    {
      signal,
    }
  );

  return {
    results,
    errors,
  };
};

export default useSearch;
