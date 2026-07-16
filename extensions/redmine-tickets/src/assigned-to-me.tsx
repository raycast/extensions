import { issueToItem, ResultItem, SearchCommand } from "./command";
import { listIssues, searchIssues } from "./redmine";

async function loadAssignedToMe(query: string, projectId: string): Promise<ResultItem[]> {
  const trimmed = query.trim();
  const options = { status: "open" as const, assignedToMe: true, limit: 100, projectId: projectId || undefined };
  const issues = trimmed ? await searchIssues(trimmed, options) : await listIssues(options);
  return issues.map(issueToItem);
}

export default function AssignedToMeCommand() {
  return SearchCommand(loadAssignedToMe, "Filter your assigned issues by text");
}
