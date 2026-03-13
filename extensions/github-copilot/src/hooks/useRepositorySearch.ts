import { useCachedPromise } from "@raycast/utils";
import { getOctokit } from "../lib/oauth";

const SEARCH_REPOSITORIES_QUERY = `
  query SearchRepositories($searchText: String!) {
    search(query: $searchText, type: REPOSITORY, first: 50) {
      repositoryCount
      nodes {
        ... on Repository {
          id
          name
          nameWithOwner
          owner {
            login
            avatarUrl(size: 64)
          }
        }
      }
    }
  }
`;

type SearchRepositoriesQueryResponse = {
  search: {
    repositoryCount: number;
    nodes: {
      id: string;
      name: string;
      nameWithOwner: string;
      owner: { login: string; avatarUrl: string };
    }[];
  };
};

export type Repository = Pick<
  SearchRepositoriesQueryResponse["search"]["nodes"][number],
  "id" | "name" | "nameWithOwner" | "owner"
>;

export function useSearchRepositories(opts: { searchQuery?: string; organizations?: string[] }) {
  return useCachedPromise(
    async (searchQuery?: string, organizations?: string[]) => {
      let searchText = `sort:pushed_at:desc sort:updated-desc`;
      if (searchQuery) {
        const [owner, repo] = searchQuery.includes("/") ? searchQuery.split("/") : [undefined, undefined];
        if (owner) {
          searchText += ` user:${owner} ${repo}`;
        } else {
          searchText += ` user:@me ${searchQuery}`;
          if (organizations) {
            searchText += ` org:${organizations.join(" org:")}`;
          }
        }
      } else {
        searchText += ` user:@me`;
        if (organizations) {
          searchText += ` org:${organizations.join(" org:")}`;
        }
      }

      const octokit = getOctokit();
      const response = await octokit.graphql<SearchRepositoriesQueryResponse>(SEARCH_REPOSITORIES_QUERY, {
        searchText,
      });

      return response.search;
    },
    [opts.searchQuery, opts.organizations],
    { keepPreviousData: true },
  );
}
