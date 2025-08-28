import { createTask } from "../services/copilot";
import { fetchRepositoryDefaultBranch } from "../services/repositories";

type Input = {
  /**
   * The prompt describing the coding task to work on
   */
  prompt: string;
  /**
   * The repository name in owner/repo format (e.g., "raycast/extensions")
   */
  repository: string;
  /**
   * The branch to use as the base branch. If not provided, uses the default branch of the repository
   */
  branch?: string;
};

/**
 * Creates a GitHub Copilot coding task with a prompt, repository, and optional branch.
 * If no branch is provided, uses the default branch of the repository.
 */
export default async function tool(input: Input) {
  const { prompt, repository, branch } = input;

  // Validate required inputs
  if (!prompt) {
    throw new Error("Prompt is required to create a task");
  }
  if (!repository) {
    throw new Error("Repository is required to create a task");
  }

  let targetBranch = branch;
  
  // If no branch provided, get the default branch
  if (!targetBranch) {
    try {
      const defaultBranch = await fetchRepositoryDefaultBranch(repository);
      if (!defaultBranch) {
        throw new Error(`Could not find default branch for repository ${repository}`);
      }
      targetBranch = defaultBranch;
    } catch (error) {
      throw new Error(`Failed to get default branch for repository ${repository}: ${error}`);
    }
  }

  try {
    const response = await createTask(repository, prompt, targetBranch);
    
    return {
      success: true,
      pullRequestUrl: response.pull_request.html_url,
      repository,
      branch: targetBranch,
      prompt,
    };
  } catch (error) {
    throw new Error(`Failed to create task: ${error}`);
  }
}