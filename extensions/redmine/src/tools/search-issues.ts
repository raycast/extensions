import { Issue, listIssues, redmineUrl, searchIssues, StatusFilter } from "../redmine";

type Input = {
  /**
   * Free text to search for inside issue subject and description.
   * Leave empty to simply list issues matching the other filters.
   */
  query?: string;
  /**
   * Which issues to include, filtered by their status.
   * - "open": only open issues
   * - "closed": only closed issues
   * - "all": both open and closed issues (default)
   */
  status?: "open" | "closed" | "all";
  /**
   * When true, restrict the results to issues assigned to the current user.
   */
  assignedToMe?: boolean;
  /**
   * When true, restrict the results to issues created by the current user.
   */
  createdByMe?: boolean;
  /**
   * Maximum number of issues to return. Defaults to 25, capped at 100.
   */
  limit?: number;
};

/** Plain, AI-friendly shape of a Redmine issue. */
function toPlainIssue(issue: Issue) {
  return {
    id: issue.id,
    subject: issue.subject,
    status: issue.status.name,
    priority: issue.priority.name,
    project: issue.project.name,
    tracker: issue.tracker.name,
    assignedTo: issue.assigned_to?.name ?? null,
    author: issue.author?.name ?? null,
    startDate: issue.start_date || null,
    dueDate: issue.due_date || null,
    updatedOn: issue.updated_on ?? null,
    description: issue.description ? issue.description.slice(0, 500) : "",
    url: `${redmineUrl}/issues/${issue.id}`,
  };
}

/**
 * Searches the Redmine issue tracker. Use this to answer questions about issues/tickets,
 * find issues matching a keyword (open or closed), or list the current user's issues.
 */
export default async function tool(input: Input) {
  const status: StatusFilter = input.status ?? "all";
  const assignedToMe = input.assignedToMe ?? false;
  const createdByMe = input.createdByMe ?? false;
  const limit = input.limit ?? 25;
  const options = { status, assignedToMe, createdByMe, limit };

  const query = input.query?.trim();
  const issues = query ? await searchIssues(query, options) : await listIssues(options);

  return {
    count: issues.length,
    query: query ?? null,
    status,
    assignedToMe,
    createdByMe,
    issues: issues.map(toPlainIssue),
  };
}
