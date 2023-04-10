import { getPreferenceValues } from "@raycast/api";
import { Octokit } from "octokit";
import { useEffect, useState } from "react";
import { SearchRepositoriesResponse } from "./types";

const preferenceValues = getPreferenceValues();
const octokit = new Octokit({ auth: preferenceValues["token"], baseUrl: preferenceValues["baseUrl"] });

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

export function useRepositories(searchText: string | undefined) {
  const [state, setState] = useState<{
    data?: SearchRepositoriesResponse["search"];
    error?: Error;
    isLoading: boolean;
  }>({ isLoading: false });

  useEffect(() => {
    if (!searchText) {
      setState({ isLoading: false });
      return;
    }

    let isCanceled = false;

    async function fetchData() {
      setState((oldState) => ({ ...oldState, isLoading: true }));

      try {
        const { search } = await octokit.graphql<SearchRepositoriesResponse>(SEARCH_REPOSITORIES_QUERY, { searchText });

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
  }, [searchText]);

  return { ...state };
}
