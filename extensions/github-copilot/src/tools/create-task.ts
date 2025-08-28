import { createTask } from "../services/copilot";
import { fetchRepositoryDefaultBranch } from "../services/repositories";
import { Tool } from "@raycast/api";

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
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt is required to create a task");
  }
  if (!repository || repository.trim().length === 0) {
    throw new Error("Repository is required to create a task");
  }

  // Validate repository format
  const cleanRepository = repository.trim();
  if (!cleanRepository.includes("/")) {
    throw new Error("Repository must be in 'owner/repo' format (e.g., 'raycast/extensions')");
  }
  
  const parts = cleanRepository.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Repository must be in 'owner/repo' format (e.g., 'raycast/extensions')");
  }

  // Validate branch name if provided
  if (branch && branch.trim().length === 0) {
    throw new Error("Branch name cannot be empty if provided");
  }

  let targetBranch = branch?.trim();
  
  // If no branch provided, get the default branch
  if (!targetBranch) {
    try {
      const defaultBranch = await fetchRepositoryDefaultBranch(cleanRepository);
      if (!defaultBranch) {
        throw new Error(`Could not find default branch for repository ${cleanRepository}`);
      }
      targetBranch = defaultBranch;
    } catch (error) {
      throw new Error(`Failed to get default branch for repository ${cleanRepository}: ${error}`);
    }
  }

  try {
    const response = await createTask(cleanRepository, prompt.trim(), targetBranch);
    
    return {
      success: true,
      pullRequestUrl: response.pull_request.html_url,
      repository: cleanRepository,
      branch: targetBranch,
      prompt: prompt.trim(),
    };
  } catch (error) {
    throw new Error(`Failed to create task: ${error}`);
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // Clean and validate input
  const cleanRepository = input.repository?.trim();
  if (!cleanRepository) {
    throw new Error("Repository is required");
  }

  // Get the target branch (resolve default branch if not provided)
  let targetBranch = input.branch?.trim();
  if (!targetBranch) {
    try {
      targetBranch = await fetchRepositoryDefaultBranch(cleanRepository);
    } catch (error) {
      // If we can't get the default branch, show the error in confirmation
      targetBranch = `<unable to determine: ${error}>`;
    }
  }

  return {
    message: 
      "Do you want to create a GitHub Copilot coding task with the following details?\n\n" +
      "🎯 Task Prompt:\n" +
      input.prompt.split("\n").map(line => `  ${line}`).join("\n") + "\n\n" +
      "📁 Repository: " + cleanRepository + "\n" +
      "🌿 Branch: " + targetBranch + "\n\n" +
      "This will create a new pull request with GitHub Copilot working on the task in the background.",
    info: [
      { name: "Repository", value: cleanRepository },
      { name: "Branch", value: targetBranch || "default" },
      { name: "Prompt Length", value: `${input.prompt.length} characters` }
    ],
  };
};