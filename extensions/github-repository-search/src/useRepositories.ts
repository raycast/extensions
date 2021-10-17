import { preferences } from "@raycast/api";
import { Octokit } from "octokit";
import useSWR from "swr";

const octokit = new Octokit({ auth: preferences.token.value });

async function searchRepositories(query: string) {
  const response = await octokit.rest.search.repos({ q: query });
  return response.data.items;
}

export function useRepositories(query: string | undefined) {
  const { data, error } = useSWR(query ?? null, searchRepositories);

  return {
    repositories: data,
    isLoading: !!query && !error && !data,
    error: error,
  };
}
