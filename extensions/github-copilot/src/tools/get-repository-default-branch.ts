import { fetchRepositoryDefaultBranch } from "../services/repositories";

type Input = {
  /**
   * The repository name in owner/repo format (e.g., "raycast/extensions")
   */
  repository: string;
};

/**
 * Gets the default branch name for a GitHub repository.
 * This is useful when you need to know what branch to use as a base for operations.
 */
export default async function tool(input: Input) {
  const { repository } = input;

  if (!repository) {
    throw new Error("Repository is required");
  }

  // Validate repository format (should be owner/repo)
  if (!repository.includes("/")) {
    throw new Error("Repository must be in 'owner/repo' format (e.g., 'raycast/extensions')");
  }
  
  const parts = repository.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Repository must be in 'owner/repo' format (e.g., 'raycast/extensions')");
  }

  try {
    const defaultBranch = await fetchRepositoryDefaultBranch(repository);
    
    if (!defaultBranch) {
      throw new Error(`Could not find default branch for repository ${repository}. The repository may not exist or you may not have access to it.`);
    }

    return {
      repository,
      defaultBranch,
    };
  } catch (error) {
    throw new Error(`Failed to get default branch for repository ${repository}: ${error}`);
  }
}