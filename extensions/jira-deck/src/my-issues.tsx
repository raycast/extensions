import { IssueList } from "./components/issue-list";
import { getMyIssues } from "./lib/source";

export default function Command() {
  return <IssueList id="my-issues" load={getMyIssues} assigneeFilter={false} />;
}
