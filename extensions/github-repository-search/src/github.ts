import { useCachedPromise } from "@raycast/utils";
import { Octokit } from "octokit";
import { preferences } from "./preferences";
import { Repository, RepositoryReleasesResponse, SearchRepositoriesResponse, UserDataResponse } from "./types";

const octokit = new Octokit({ auth: preferences.token });

async function fetchUserData() {
  return await octokit.graphql<UserDataResponse>(`
    query UserData {
      viewer {
        login
        organizations(first: 100) {
          nodes {
            login
          }
        }
      }
    }
  `);
}

async function fetchReleases(owner: string, name: string) {
  return await octokit.graphql<RepositoryReleasesResponse>(
    `
    query RepositoryReleases($name: String!, $owner: String!) {
      repository (name: $name, owner: $owner) {
        ... on Repository {
          releases (first: 30, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              id
              description
              name
              publishedAt
              createdAt
              tagName
              url
            }
          }
        }
      }
    }
    `,
    {
      owner,
      name,
    }
  );
}

async function fetchRepositories(searchQuery: string | undefined) {
  return await octokit.graphql<SearchRepositoriesResponse>(
    `
    query SearchRepositories($searchQuery: String!) {
      search(query: $searchQuery, type: REPOSITORY, first: 50) {
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
    }
    `,
    {
      searchQuery,
    }
  );
}
export function useUserData() {
  return useCachedPromise(fetchUserData);
}

export function useReleases(repository: Repository) {
  const [owner, name] = repository.nameWithOwner.split("/");
  return useCachedPromise(fetchReleases, [owner, name]);
}

export function useRepositories(searchQuery: string | undefined) {
  return useCachedPromise(fetchRepositories, [searchQuery]);
}
