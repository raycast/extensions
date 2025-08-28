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

  let repositories: Repository[] = [];

  try {
    if (owner) {
      // Search repositories by owner with optional query filter
      repositories = await fetchRepositoriesByOwner(owner, query);
    } else {
      // Get recent repositories from user activity
      repositories = await fetchRecentRepositories();
      
      // Apply query filter if provided
      if (query) {
        repositories = repositories.filter(repo => 
          repo.name.toLowerCase().includes(query.toLowerCase()) ||
          repo.nameWithOwner.toLowerCase().includes(query.toLowerCase())
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
        owner: owner || null,
        query: query || null,
        limit,
      },
    };
  } catch (error) {
    throw new Error(`Failed to search repositories: ${error}`);
  }
}