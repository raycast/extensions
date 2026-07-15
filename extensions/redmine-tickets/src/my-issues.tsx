import { issueToItem, ResultItem, SearchCommand } from "./command";
import { listIssues, searchIssues } from "./redmine";

async function loadMyIssues(query: string, projectId: string): Promise<ResultItem[]> {
  const trimmed = query.trim();
  const issues = trimmed
    ? await searchIssues(trimmed, "open", true, 100, projectId || undefined)
    : await listIssues("open", true, 100, projectId || undefined);
  return issues.map(issueToItem);
}

export default function MyIssuesCommand() {
  return SearchCommand(loadMyIssues, "Filter my issues by text");
}
