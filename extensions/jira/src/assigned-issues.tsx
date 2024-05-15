import StatusIssueList from "./components/StatusIssueList";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import useIssues from "./hooks/useIssues";

export function AssignedIssues() {
  const { issues, isLoading, mutate } = useIssues(
    "assignee = currentUser() AND status NOT IN (Canceled, Done) ORDER BY updated DESC",
  );

  return <StatusIssueList issues={issues} isLoading={isLoading} mutate={mutate} />;
}

export default withJiraCredentials(AssignedIssues);
