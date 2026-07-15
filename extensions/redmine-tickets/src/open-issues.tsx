import { issueToItem, ResultItem, SearchCommand } from "./command";
import { listIssues } from "./redmine";

async function loadOpenIssues(_query: string, projectId: string): Promise<ResultItem[]> {
  const issues = await listIssues("open", false, 100, projectId || undefined);
  return issues.map(issueToItem);
}

export default function OpenIssuesCommand() {
  return SearchCommand(loadOpenIssues, "Filter open issues by text");
}
