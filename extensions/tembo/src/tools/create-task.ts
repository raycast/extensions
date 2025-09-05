import { temboAPI } from "../api";

type Input = {
  /**
   * The task description or assignment to create in Tembo
   */
  prompt: string;
  /**
   * The repository name to associate with the task (optional)
   */
  repository?: string;
  /**
   * The target branch for the task (optional)
   */
  branch?: string;
  /**
   * Whether to queue the task immediately for processing (defaults to true)
   */
  queueImmediately?: boolean;
};

/**
 * Creates a task in Tembo with the given prompt and optional repository/branch information.
 * The task will be queued for processing by Tembo's AI agents.
 */
async function tool(input: Input) {
  const { prompt, repository, branch, queueImmediately = true } = input;

  // Validate required inputs
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt is required to create a task");
  }

  let codeRepoIds: string[] | undefined;
  if (repository) {
    try {
      const repositories = await temboAPI.getCodeRepositories();

      const matchedRepo = repositories.find(
        (repo) =>
          repo.name.toLowerCase().includes(repository.toLowerCase()) ||
          repo.id === repository ||
          repo.url.toLowerCase().includes(repository.toLowerCase()),
      );

      if (!matchedRepo) {
        const repoNames = repositories.map((r) => r.name).join(", ");
        throw new Error(
          `Repository "${repository}" not found. Available repositories: ${repoNames || "None"}`,
        );
      }

      codeRepoIds = [matchedRepo.id];
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        throw error; // Re-throw our custom error
      }
      throw new Error(`Failed to fetch repositories: ${error}`);
    }
  }

  const title = `Task: ${prompt.slice(0, 50)}${prompt.length > 50 ? "..." : ""}`;

  try {
    const issue = await temboAPI.createIssue({
      title,
      description: prompt.trim(),
      json: JSON.stringify({
        createdVia: "raycast-tool",
        repository: repository || null,
        branch: branch || null,
      }),
      queueRightAway: queueImmediately,
      codeRepoIds,
    });

    return {
      success: true,
      taskId: issue.id,
      title: issue.title,
      description: prompt.trim(),
      repository: repository || null,
      branch: branch || null,
      queuedImmediately: queueImmediately,
      externalUrl: issue.externalUrl || null,
      message: `Task "${issue.title}" created successfully${queueImmediately ? " and queued for processing" : ""}.`,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("401")) {
      throw new Error(
        "Authentication failed. Please check your Tembo API key in Raycast preferences.",
      );
    }
    throw new Error(`Failed to create task: ${error}`);
  }
}

export default tool;
