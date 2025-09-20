import fetch from "node-fetch";
import { Octokit } from "octokit";
import { useEffect, useState } from "react";
import { getPreferenceValues } from "@raycast/api";
import type { SearchRepositoriesResponse } from "@/types";

const preferenceValues = getPreferenceValues<ExtensionPreferences>();
const octokit = new Octokit({ request: { fetch }, auth: preferenceValues.token, baseUrl: preferenceValues.baseUrl });

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

function buildSearchText(baseSearchText?: string): string | undefined {
  if (!baseSearchText) {
    return;
  }

  const searchTextParts: string[] = [];
  if (preferenceValues.users) {
    const users = preferenceValues.users
      .split(",")
      .map((user) => user.trim())
      .filter((user) => user.length > 0);
    if (users.length > 0) {
      const usersSearchText = users.map((user) => `user:${user}`).join(" ");
      searchTextParts.push(usersSearchText);
    }
  }

  if (preferenceValues.includeForks) {
    searchTextParts.push("fork:true");
  }

  if (preferenceValues.additionalFilters) {
    searchTextParts.push(preferenceValues.additionalFilters);
  }

  searchTextParts.push(baseSearchText);

  return searchTextParts.join(" ");
}

export function useRepositories(baseSearchText: string | undefined) {
  const [state, setState] = useState<{
    data?: SearchRepositoriesResponse["search"];
    error?: Error;
    isLoading: boolean;
  }>({ isLoading: false });

  useEffect(() => {
    if (!baseSearchText) {
      setState({ isLoading: false });
      return;
    }

    let isCanceled = false;

    async function fetchData() {
      setState((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const { search } = await octokit.graphql<SearchRepositoriesResponse>(SEARCH_REPOSITORIES_QUERY, {
          searchText: buildSearchText(baseSearchText),
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
  }, [baseSearchText]);

  return { ...state };
}
