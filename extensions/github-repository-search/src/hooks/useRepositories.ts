import fetch from "node-fetch";
import { Octokit } from "octokit";
import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import type { SearchRepositoriesResponse } from "@/types";

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
        releases {
          totalCount
        }
      }
    }
  }
}`;

function buildSearchText(
  baseSearchText: string | undefined,
  prefs: { users?: string; includeForks?: boolean; additionalFilters?: string },
): string | undefined {
  if (!baseSearchText) {
    return;
  }

  const searchTextParts: string[] = [];
  if (prefs.users) {
    const users = prefs.users
      .split(",")
      .map((user) => user.trim())
      .filter((user) => user.length > 0);
    if (users.length > 0) {
      const usersSearchText = users.map((user) => `user:${user}`).join(" ");
      searchTextParts.push(usersSearchText);
    }
  }

  if (prefs.includeForks) {
    searchTextParts.push("fork:true");
  }

  if (prefs.additionalFilters) {
    searchTextParts.push(prefs.additionalFilters);
  }

  searchTextParts.push(baseSearchText);

  return searchTextParts.join(" ");
}

export function useRepositories(baseSearchText: string | undefined, token: string, baseUrl?: string) {
  const prefs = getPreferenceValues<{ users?: string; includeForks?: boolean; additionalFilters?: string }>();
  const [state, setState] = useState<{
    data?: SearchRepositoriesResponse["search"];
    error?: Error;
    isLoading: boolean;
  }>({ isLoading: false });

  useEffect(() => {
    if (!baseSearchText || !token) {
      setState({ isLoading: false });
      return;
    }

    let isCanceled = false;
    const octokit = new Octokit({ request: { fetch }, auth: token, baseUrl: baseUrl ?? undefined });

    async function fetchData() {
      setState((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const { search } = await octokit.graphql<SearchRepositoriesResponse>(SEARCH_REPOSITORIES_QUERY, {
          searchText: buildSearchText(baseSearchText, prefs),
        });

        if (!isCanceled) {
          setState((oldState) => ({ ...oldState, data: search }));
        }
      } catch (e) {
        if (!isCanceled) {
          setState((oldState) => ({
            ...oldState,
            error: e instanceof Error ? e : new Error("Something went wrong"),
          }));
        }
      } finally {
        if (!isCanceled) {
          setState((oldState) => ({ ...oldState, isLoading: false }));
        }
      }
    }

    fetchData();

    return () => {
      isCanceled = true;
    };
  }, [baseSearchText, token, baseUrl]);

  return { ...state };
}
