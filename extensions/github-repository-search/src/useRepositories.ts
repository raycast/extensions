import { preferences } from "@raycast/api";
import { Octokit } from "octokit";
import useSWR from "swr";
import { SearchRepositoriesResponse } from "./types";

const octokit = new Octokit({ auth: preferences.token.value });

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

async function searchRepositories(searchText: string) {
  const { search } = await octokit.graphql<SearchRepositoriesResponse>(SEARCH_REPOSITORIES_QUERY, { searchText });
  return search;
}

export function useRepositories(query: string | undefined) {
  const { data, error } = useSWR(query ?? null, searchRepositories);

  return {
    data,
    isLoading: !!query && !error && !data,
    error: error,
  };
}
