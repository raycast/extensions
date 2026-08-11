import { useCachedPromise } from "@raycast/utils";
import { GraphqlResponseError } from "@octokit/graphql";
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

const CONTRIBUTED_REPOSITORIES_QUERY = `
  query ContributedRepositories {
    viewer {
      repositoriesContributedTo(
        first: 100
        contributionTypes: [COMMIT, PULL_REQUEST]
        includeUserRepositories: true
      ) {
        nodes {
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

type RepositoryNode = {
  id: string;
  name: string;
  nameWithOwner: string;
  owner: { login: string; avatarUrl: string };
};

type SearchRepositoriesQueryResponse = {
  search: {
    repositoryCount: number;
    nodes: RepositoryNode[];
  };
};

type ContributedRepositoriesQueryResponse = {
  viewer: {
    repositoriesContributedTo: {
      nodes: RepositoryNode[];
    };
  };
};

export type Repository = Pick<RepositoryNode, "id" | "name" | "nameWithOwner" | "owner">;

export function useSearchRepositories(opts: { searchQuery?: string; organizations?: string[] }) {
  return useCachedPromise(
    async (searchQuery?: string, organizations?: string[]) => {
      const octokit = getOctokit();

      // When there's no search query, show repos the user has actually contributed to
      if (!searchQuery) {
        try {
          const response = await octokit.graphql<ContributedRepositoriesQueryResponse>(CONTRIBUTED_REPOSITORIES_QUERY);
          const nodes = response.viewer.repositoriesContributedTo.nodes.filter((n) => n != null);
          return { nodes };
        } catch (error) {
          // If some orgs require SAML, the query may return partial data alongside errors.
          if (error instanceof GraphqlResponseError) {
            const nodes = (error.data?.viewer?.repositoriesContributedTo?.nodes ?? []).filter(
              (node: RepositoryNode | null) => node != null,
            );
            return { nodes: nodes as RepositoryNode[] };
          }
          throw error;
        }
      }

      // When searching, use the search API
      let searchText = `sort:updated-desc`;
      const [owner, repo] = searchQuery.includes("/") ? searchQuery.split("/") : [undefined, undefined];
      if (owner) {
        searchText += ` user:${owner} ${repo}`;
      } else {
        searchText += ` user:@me ${searchQuery}`;
        if (organizations) {
          searchText += organizations.map((org) => ` org:${org}`).join("");
        }
      }

      const response = await octokit.graphql<SearchRepositoriesQueryResponse>(SEARCH_REPOSITORIES_QUERY, {
        searchText,
      });

      return { nodes: response.search.nodes };
    },
    [opts.searchQuery, opts.organizations],
    { keepPreviousData: true },
  );
}
