import { IssueScope, IssueState } from "./components/issues";
import { MyIssues } from "./components/issues_my";

export default function MyIssuesSearchRoot(): JSX.Element {
  return <MyIssues scope={IssueScope.created_by_me} state={IssueState.all} />;
}
