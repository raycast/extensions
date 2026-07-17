import { showToast, Toast } from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { URLSearchParams } from "url";
import fetch, { AbortError } from "node-fetch";
import { SearchState, SearchResult } from "./models";

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    query: "",
    result: {
      hasMoreItems: false,
      items: [],
    },
    isLoading: true,
    lastPage: 1,
  });

  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(query: string, page: number) {
      if (query.length == 0) {
        setState((oldState) => ({
          ...oldState,
          query: "",
          result: {
            hasMoreItems: false,
            items: [],
          },
          isLoading: false,
          lastPage: 1,
        }));
        cancelRef.current?.abort();
        return;
      } else if (state.query === query && state.lastPage === page && state.isLoading) return;

      cancelRef.current?.abort();
      cancelRef.current = new AbortController();

      setState((oldState) => ({
        ...oldState,
        query: query,
        isLoading: true,
      }));

      try {
        const result = await performSearch(query, page, cancelRef.current.signal);

        if (page < 2) {
          setState((oldState) => ({
            ...oldState,
            query: query,
            result: result,
            isLoading: false,
            lastPage: page,
          }));
        } else {
          setState((oldState) => ({
            ...oldState,
            query: query,
            result: {
              hasMoreItems: result.hasMoreItems,
              items: oldState.result.items.concat(result.items),
            },
            isLoading: false,
            lastPage: page,
          }));
        }
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        if (error instanceof AbortError) {
          return;
        }

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [cancelRef, setState]
  );

  useEffect(() => {
    search("", 0);
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return {
    state: state,
    search: search,
  };
}

async function performSearch(query: string, page: number, signal: AbortSignal): Promise<SearchResult> {
  const params = new URLSearchParams();
  params.append("query", query);
  params.append("page", page.toString());

  const response = await fetch(
    "https://spi-proxy-worker.dev-capturecontext-8f5.workers.dev/search?" + params.toString(),
    {
      method: "get",
      signal: signal as any,
    }
  );

  const json = (await response.json()) as {
    hasMoreResults: boolean;
    results: {
      package: {
        _0: {
          packageId: string;
          packageName: string;
          summary?: string;
          repositoryName: string;
          repositoryOwner: string;
          packageURL: string;
        };
      };
    }[];
  };

  if (!response.ok) {
    throw new Error(`Could not fetch packages [status: ${response.statusText}]`);
  }

  const items = json.results
    .filter((result) => {
      return result.package;
    })
    .map((result) => {
      const githubBaseURL = "https://github.com";
      const spiBaseURL = "https://swiftpackageindex.com";
      const manifest = result.package._0;
      return {
        id: manifest.packageId,
        name: manifest.packageName,
        description: manifest.summary,
        repositoryName: manifest.repositoryName,
        username: "@" + manifest.repositoryOwner,
        githubURL: `${githubBaseURL}/${manifest.repositoryOwner}/${manifest.repositoryName}`,
        authorGithubURL: `${githubBaseURL}/${manifest.repositoryOwner}`,
        spiURL: `${spiBaseURL}/${manifest.repositoryOwner}/${manifest.repositoryName}`,
        authorSPIURL: `${spiBaseURL}/${manifest.repositoryOwner}`,
      };
    });

  return {
    hasMoreItems: json.hasMoreResults,
    items: items,
  };
}
