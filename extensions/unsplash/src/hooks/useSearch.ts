import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import fetch, { AbortError } from "node-fetch";

export const useSearch = <T extends "collections" | "photos">(type: T) => {
  const { accessKey, orientation } = getPreferenceValues();

  const [state, setState] = useState<SearchState<T>>({ results: [], isLoading: true });
  const cancelRef = useRef<AbortController | null>(null);

  try {
    if (!accessKey) throw new Error("Missing API key.");

    useEffect(() => {
      search("");

      return () => {
        cancelRef.current?.abort();
      };
    }, []);

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
          accessKey,
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
  } catch (error) {
    console.error(error);

    const result = {
      search: () => ({}),
      state: {
        results: [],
        isLoading: false,
      },
    };

    showToast(Toast.Style.Failure, "Something went wrong", String(error));
    return result;
  }
};

// Perform Search
interface PerformSearchProps {
  accessKey: string;
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
  accessKey,
  signal,
}: PerformSearchProps): Promise<{ errors?: string[]; results: SearchOrCollectionResult<T> }> => {
  const searchParams = new URLSearchParams({
    page: "1",
    query: searchText,
    per_page: "30",
  });

  if (options.orientation !== "all") searchParams.append("orientation", options.orientation);

  const { errors, results } = await fetch(
    `https://api.unsplash.com/search/${options.type}?${searchParams.toString()}`,
    {
      method: "GET",
      signal,
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    }
  ).then((res) => res.json() as Promise<{ errors?: string[]; results: SearchOrCollectionResult<T> }>);

  return {
    results,
    errors,
  };
};

export default useSearch;
