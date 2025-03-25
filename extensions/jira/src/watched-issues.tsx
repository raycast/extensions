import StatusIssueList from "./components/StatusIssueList";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import useIssues from "./hooks/useIssues";

export function WatchedIssues() {
  const { issues, isLoading, mutate } = useIssues("watcher = currentUser() ORDER BY updated DESC");

  return <StatusIssueList issues={issues} isLoading={isLoading} mutate={mutate} />;
}

export default withJiraCredentials(WatchedIssues);
