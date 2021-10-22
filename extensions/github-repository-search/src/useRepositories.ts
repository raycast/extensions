import { preferences } from "@raycast/api";
import { Octokit } from "octokit";
import { useEffect, useRef, useState } from "react";
import { SearchRepositoriesResponse } from "./types";

const SEARCH_REPOSITORIES_QUERY = `
query SearchRepositories($searchText: String!) {
  search(query: $searchText, type: REPOSITORY, first: 50) {
    repositoryCount
    nodes {
      ... on Repository {
        id
        nameWithOwner
        owner {
          avatarUrl(size: 64)
        }
        viewerHasStarred
        stargazerCount
        primaryLanguage {
          name
        }
        updatedAt
        url
        hasIssuesEnabled
        hasWikiEnabled
        hasProjectsEnabled
      }
    }
  }
}`;

const octokit = new Octokit({ auth: preferences.token.value });

export function useRepositories(searchText: string | undefined) {
  const [state, setState] = useState<{
    data?: SearchRepositoriesResponse["search"];
    error?: Error;
    isLoading: boolean;
  }>({ isLoading: false });
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!searchText) {
      setState({ isLoading: false });
      return;
    }

    async function fetchData() {
      setState((oldState) => ({ ...oldState, isLoading: true }));

      abortController.current?.abort();
      abortController.current = new AbortController();

      try {
        const { search } = await octokit.graphql<SearchRepositoriesResponse>(SEARCH_REPOSITORIES_QUERY, {
          searchText,
          request: { signal: abortController.current.signal },
        });

        setState((oldState) => ({ ...oldState, data: search, isLoading: false }));
      } catch (error) {
        console.error("Failed searching repositories", error);

        setState((oldState) => ({
          ...oldState,
          error: error instanceof Error ? error : new Error("Something went wrong"),
          isLoading: false,
        }));
      }
    }

    fetchData();

    return () => {
      abortController.current?.abort();
    };
  }, [searchText]);

  return { ...state };
}
