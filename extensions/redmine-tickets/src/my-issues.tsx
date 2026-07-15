import { issueToItem, ResultItem, SearchCommand } from "./command";
import { listIssues } from "./redmine";

async function loadMyIssues(_query: string, projectId: string): Promise<ResultItem[]> {
  const issues = await listIssues("open", true, 100, projectId || undefined);
  return issues.map(issueToItem);
}

export default function MyIssuesCommand() {
  return SearchCommand(loadMyIssues, "Filter my issues by text");
}
