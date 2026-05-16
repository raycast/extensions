import { ErrorIssueStatus, listErrorIssues } from "../api/errors";
import { getActiveProjectId, paginate, projectUrl } from "./_shared";

type Input = {
  /**
   * Filter by issue status. Defaults to "active".
   * One of: "active", "resolved", "archived", "pending_release", "suppressed".
   */
  status?: ErrorIssueStatus;
  /** ISO 8601 datetime for the start of the window. Defaults to 7 days ago. */
  dateFrom?: string;
  /** ISO 8601 datetime for the end of the window. Defaults to now. */
  dateTo?: string;
  /** Maximum number of issues to return. Defaults to 20. */
  limit?: number;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const { results } = await listErrorIssues(projectId, {
    status: input.status ?? "active",
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  });
  const { items, truncated, total } = paginate(results, input.limit ?? 20);
  return {
    truncated,
    total,
    issues: items.map((i) => ({
      id: i.id,
      name: i.name,
      status: i.status,
      occurrences: i.occurrences,
      users: i.users,
      first_seen: i.first_seen,
      last_seen: i.last_seen,
      url: projectUrl(`error_tracking/${i.id}`),
    })),
  };
}
