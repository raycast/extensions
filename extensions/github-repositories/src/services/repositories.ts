import { handleGitHubError } from "../lib/github-client";
import { getOctokit } from "../lib/oauth";

interface GitHubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count?: number;
  language?: string | null;
  updated_at?: string | null;
  pushed_at?: string | null;
  private: boolean;
  owner?: {
    login: string;
  };
}

export interface Repository {
  id: string;
  name: string;
  owner: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  language: string | null;
  updatedAt: string;
  pushedAt: string;
  isPrivate: boolean;
  usageScore: number; // Composite score for sorting
}

/**
 * Calculate a usage score based on stars, recent activity, and other factors
 */
const calculateUsageScore = (repo: {
  stargazers_count: number;
  updated_at: string;
  pushed_at: string;
}): number => {
  const stars = repo.stargazers_count;

  // Calculate recency score (repos updated/pushed recently get higher scores)
  const now = new Date().getTime();
  const updated = new Date(repo.updated_at).getTime();
  const pushed = new Date(repo.pushed_at).getTime();

  const daysSinceUpdate = (now - updated) / (1000 * 60 * 60 * 24);
  const daysSincePush = (now - pushed) / (1000 * 60 * 60 * 24);

  // Recency score: higher for repos updated/pushed recently
  // Use exponential decay so recent activity matters more
  const recencyScore =
    Math.exp(-daysSinceUpdate / 30) * 100 + Math.exp(-daysSincePush / 30) * 100;

  // Combine stars and recency with weights
  // Stars are multiplied by 2 to give them more weight
  const score = stars * 2 + recencyScore;

  return score;
};

/**
 * Fetch all repositories for the authenticated user, sorted by usage
 */
export const fetchRepositories = async (): Promise<Repository[]> => {
  const octokit = getOctokit();

  try {
    // Fetch all repositories (both owned and contributed to)
    const { data: repos } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
      affiliation: "owner,collaborator,organization_member",
    });

    // Transform and calculate usage scores
    const repositories: Repository[] = repos.map((repo: GitHubRepoResponse) => {
      const updatedAt = repo.updated_at || new Date().toISOString();
      const pushedAt = repo.pushed_at || updatedAt;

      return {
        id: repo.id.toString(),
        name: repo.name,
        owner: repo.owner?.login || "",
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count || 0,
        language: repo.language ?? null,
        updatedAt,
        pushedAt,
        isPrivate: repo.private,
        usageScore: calculateUsageScore({
          stargazers_count: repo.stargazers_count || 0,
          updated_at: updatedAt,
          pushed_at: pushedAt,
        }),
      };
    });

    // Sort by usage score (highest first)
    repositories.sort((a, b) => b.usageScore - a.usageScore);

    return repositories;
  } catch (error) {
    throw handleGitHubError(error);
  }
};

/**
 * Fetch repositories for a specific owner/organization
 */
export const fetchRepositoriesByOwner = async (
  owner: string,
): Promise<Repository[]> => {
  const octokit = getOctokit();

  try {
    const { data: repos } = await octokit.rest.repos.listForUser({
      username: owner,
      sort: "updated",
      per_page: 100,
    });

    const repositories: Repository[] = repos.map((repo: GitHubRepoResponse) => {
      const updatedAt = repo.updated_at || new Date().toISOString();
      const pushedAt = repo.pushed_at || updatedAt;

      return {
        id: repo.id.toString(),
        name: repo.name,
        owner: repo.owner?.login || "",
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        stars: repo.stargazers_count || 0,
        language: repo.language ?? null,
        updatedAt,
        pushedAt,
        isPrivate: repo.private,
        usageScore: calculateUsageScore({
          stargazers_count: repo.stargazers_count || 0,
          updated_at: updatedAt,
          pushed_at: pushedAt,
        }),
      };
    });

    repositories.sort((a, b) => b.usageScore - a.usageScore);

    return repositories;
  } catch (error) {
    throw handleGitHubError(error);
  }
};
