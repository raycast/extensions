import { handleGitHubError } from "../lib/github-client";
import { getOctokit } from "../lib/oauth";

export interface Repository {
  id: string;
  name: string;
  owner: {
    login: string;
  };
  nameWithOwner: string;
}

export const fetchRecentRepositories = async (): Promise<Repository[]> => {
  const octokit = getOctokit();

  try {
    // Get the authenticated user's username first
    const { data: user } = await octokit.rest.users.getAuthenticated();

    // Fetch recent events for the user
    const { data: events } = await octokit.rest.activity.listPublicEventsForUser({
      username: user.login,
      per_page: 100,
    });

    // Extract unique repositories from push events, sorted by most recent activity
    const repositories = new Map<string, Repository>();

    for (const event of events) {
      if (event.type === "PushEvent" && event.repo) {
        const repoKey = event.repo.name;
        if (!repositories.has(repoKey)) {
          const [owner, name] = event.repo.name.split("/");
          repositories.set(repoKey, {
            id: event.repo.id.toString(),
            name,
            owner: { login: owner },
            nameWithOwner: event.repo.name,
          });
        }
      }
    }

    return Array.from(repositories.values());
  } catch (error) {
    throw handleGitHubError(error);
  }
};

export const fetchRepositoriesByOwner = async (owner: string, repoFilter?: string): Promise<Repository[]> => {
  const octokit = getOctokit();

  try {
    // Build search query - if there's a repo filter, include it in the search
    const searchQuery = repoFilter ? `user:${owner} ${repoFilter} in:name` : `user:${owner}`;

    const { data } = await octokit.rest.search.repos({
      q: searchQuery,
      per_page: 50,
    });

    return data.items.map((repo) => ({
      id: repo.id.toString(),
      name: repo.name,
      owner: { login: repo.owner?.login || "" },
      nameWithOwner: repo.full_name,
    }));
  } catch (error) {
    throw handleGitHubError(error);
  }
};

export const fetchRepositoryByNwo = async (nwo: string): Promise<Repository | null> => {
  if (!nwo) {
    return null;
  }

  const octokit = getOctokit();

  try {
    const [owner, repo] = nwo.split("/");

    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo,
    });

    return {
      id: repoData.id.toString(),
      name: repoData.name,
      owner: { login: repoData.owner.login },
      nameWithOwner: repoData.full_name,
    };
  } catch (error) {
    throw handleGitHubError(error);
  }
};

export const fetchRepositoryDefaultBranch = async (nwo: string): Promise<string | null> => {
  if (!nwo) return null;

  const [owner, repo] = nwo.split("/");

  const octokit = getOctokit();

  try {
    const repositoryResponse = await octokit.rest.repos.get({
      owner,
      repo,
    });

    return repositoryResponse.data.default_branch;
  } catch (error) {
    throw handleGitHubError(error);
  }
};
