import StatusIssueList from "./components/StatusIssueList";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import useIssues from "./hooks/useIssues";

export function OpenIssues() {
  const { issues, isLoading, mutate } = useIssues(
    "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC",
  );

  return <StatusIssueList issues={issues} isLoading={isLoading} mutate={mutate} />;
}

export default withJiraCredentials(OpenIssues);
