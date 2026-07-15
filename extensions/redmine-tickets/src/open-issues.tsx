import { issueToItem, ResultItem, SearchCommand } from "./command";
import { listIssues, searchIssues } from "./redmine";

async function loadOpenIssues(query: string, projectId: string): Promise<ResultItem[]> {
  const trimmed = query.trim();
  const issues = trimmed
    ? await searchIssues(trimmed, "open", false, 100, projectId || undefined)
    : await listIssues("open", false, 100, projectId || undefined);
  return issues.map(issueToItem);
}

export default function OpenIssuesCommand() {
  return SearchCommand(loadOpenIssues, "Filter open issues by text");
}
