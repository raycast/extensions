import { Octokit } from "octokit";
import { preferences } from "./preferences";
import { RepositoryReleasesResponse, SearchRepositoriesResponse, UserDataResponse } from "./types";

const octokit = new Octokit({ auth: preferences.token });

export async function fetchUserData() {
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

export async function fetchReleases(owner: string, name: string) {
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

export async function fetchRepositories(searchQuery: string | undefined) {
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
