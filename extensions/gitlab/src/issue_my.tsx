import { IssueScope, IssueState } from "./components/issues";
import { MyIssues } from "./components/issues_my";

export default function MyOpenIssuesRoot(): JSX.Element {
  return <MyIssues scope={IssueScope.assigned_to_me} state={IssueState.opened} />;
}
