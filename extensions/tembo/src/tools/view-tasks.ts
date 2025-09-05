import { temboAPI } from "../api";

type Input = {
  /**
   * Filter tasks by repository name (optional)
   */
  repository?: string;
  /**
   * Task view filter: "all", "backlog", or "waiting" (defaults to "all")
   */
  view?: "all" | "backlog" | "waiting";
  /**
   * Maximum number of tasks to return (defaults to 10, max 50)
   */
  limit?: number;
  /**
   * Filter by task severity levels (optional)
   */
  severity?: string[];
};

/**
 * Retrieves and displays tasks from Tembo, with optional filtering by repository, view type, and other criteria.
 */
async function tool(input: Input) {
  const { repository, view = "all", limit = 10, severity } = input;

  const taskLimit = Math.min(Math.max(limit || 10, 1), 50);

  try {
    const issues = await temboAPI.getIssues({
      pageSize: taskLimit,
      taskView: view,
      severity,
      showHiddenIssues: false,
    });

    let filteredIssues = issues;
    if (repository) {
      const repositoryLower = repository.toLowerCase();
      filteredIssues = issues.filter((issue) => {
        return (
          issue.solutions.some((solution) =>
            solution.pullRequest.some((pr) =>
              pr.url.toLowerCase().includes(repositoryLower),
            ),
          ) || issue.title.toLowerCase().includes(repositoryLower)
        );
      });
    }

    if (filteredIssues.length === 0) {
      return {
        success: true,
        tasks: [],
        totalCount: 0,
        message: repository
          ? `No tasks found for repository "${repository}" in ${view} view.`
          : `No tasks found in ${view} view.`,
      };
    }

    const formattedTasks = filteredIssues.map((issue) => ({
      id: issue.id,
      title: issue.title,
      summary: issue.summary || "No summary available",
      kind: issue.kind,
      level: issue.level,
      levelReasoning: issue.levelReasoning,
      status:
        issue.solutions.length > 0 ? issue.solutions[0].status : "Pending",
      externalUrl: issue.externalUrl,
      repository: issue.issueSource?.name || "Unknown",
      createdAt: issue.createdAt,
      lastSeenAt: issue.lastSeenAt,
      tags: issue.tags?.map((tag) => tag.name) || [],
      pullRequests: issue.solutions.flatMap((solution) =>
        solution.pullRequest.map((pr) => ({
          url: pr.url,
          title: pr.title,
          status: pr.status,
        })),
      ),
    }));

    return {
      success: true,
      tasks: formattedTasks,
      totalCount: filteredIssues.length,
      view,
      repository: repository || null,
      message: `Found ${filteredIssues.length} task${filteredIssues.length !== 1 ? "s" : ""} in ${view} view${repository ? ` for repository "${repository}"` : ""}.`,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("401")) {
      throw new Error(
        "Authentication failed. Please check your Tembo API key in Raycast preferences.",
      );
    }
    throw new Error(`Failed to retrieve tasks: ${error}`);
  }
}

export default tool;
