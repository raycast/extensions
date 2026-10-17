import { handleGitHubError } from "../lib/github-client";
import { getOctokit } from "../lib/oauth";

export const fetchRepositoryBranches = async (nwo: string): Promise<string[]> => {
  if (!nwo) {
    return [];
  }

  const [owner, repo] = nwo.split("/");
  const octokit = getOctokit();

  const query = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        refs(refPrefix: "refs/heads/", first: 100) {
          nodes {
            name
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;

  try {
    const response = await octokit.graphql<{
      repository: {
        refs: {
          nodes: Array<{
            name: string;
          }>;
        };
      };
    }>(query, { owner, repo });

    return response.repository.refs.nodes.map((ref) => ref.name);
  } catch (error) {
    throw handleGitHubError(error);
  }
};

export const fetchBranchesByPrefix = async (repository: string, prefix: string): Promise<string[]> => {
  if (!repository) {
    return [];
  }

  const [owner, repo] = repository.split("/");

  const octokit = getOctokit();

  const query = `
    query($owner: String!, $repo: String!, $prefix: String!) {
      repository(owner: $owner, name: $repo) {
        refs(refPrefix: "refs/heads/", query: $prefix, first: 100) {
          nodes {
            name
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;

  try {
    const response = await octokit.graphql<{
      repository: {
        refs: {
          nodes: Array<{
            name: string;
          }>;
        };
      };
    }>(query, { owner, repo, prefix });

    return response.repository.refs.nodes.map((ref) => ref.name);
  } catch (error) {
    throw handleGitHubError(error);
  }
};
