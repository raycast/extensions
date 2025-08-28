import { fetchRecentRepositories, fetchRepositoriesByOwner, Repository } from "../services/repositories";

type Input = {
  /**
   * The owner/organization to search repositories for (optional)
   */
  owner?: string;
  /**
   * A search query to filter repositories by name (optional)
   */
  query?: string;
  /**
   * Maximum number of repositories to return (optional, defaults to 20)
   */
  limit?: number;
};

/**
 * Searches for GitHub repositories. Can search recent repositories, repositories by owner, or use a query filter.
 * Returns a list of repositories with their full names that can be used with other tools.
 */
export default async function tool(input: Input = {}) {
  const { owner, query, limit = 20 } = input;

  // Validate limit
  if (limit && (limit < 1 || limit > 100)) {
    throw new Error("Limit must be between 1 and 100");
  }

  let repositories: Repository[] = [];

  try {
    if (owner) {
      // Validate owner name (basic validation)
      if (owner.trim().length === 0) {
        throw new Error("Owner cannot be empty");
      }
      // Search repositories by owner with optional query filter
      repositories = await fetchRepositoriesByOwner(owner.trim(), query?.trim() || undefined);
    } else {
      // Get recent repositories from user activity
      repositories = await fetchRecentRepositories();
      
      // Apply query filter if provided
      if (query && query.trim()) {
        const queryLower = query.trim().toLowerCase();
        repositories = repositories.filter(repo => 
          repo.name.toLowerCase().includes(queryLower) ||
          repo.nameWithOwner.toLowerCase().includes(queryLower)
        );
      }
    }

    // Limit the results
    const limitedRepositories = repositories.slice(0, limit);

    return {
      repositories: limitedRepositories.map(repo => ({
        id: repo.id,
        name: repo.name,
        owner: repo.owner.login,
        nameWithOwner: repo.nameWithOwner,
        fullName: repo.nameWithOwner, // For convenience
      })),
      totalFound: repositories.length,
      totalReturned: limitedRepositories.length,
      searchCriteria: {
        owner: owner?.trim() || null,
        query: query?.trim() || null,
        limit,
      },
    };
  } catch (error) {
    throw new Error(`Failed to search repositories: ${error}`);
  }
}