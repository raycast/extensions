import StatusIssueList from "./components/StatusIssueList";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import useIssues from "./hooks/useIssues";

export function ReportedIssues() {
  const { issues, isLoading, mutate } = useIssues("reporter = currentUser() ORDER BY updated DESC");

  return <StatusIssueList issues={issues} isLoading={isLoading} mutate={mutate} />;
}

export default withJiraCredentials(ReportedIssues);
