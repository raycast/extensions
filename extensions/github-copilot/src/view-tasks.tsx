import { ActionPanel, Action, Icon, List, launchCommand, LaunchType, Color } from "@raycast/api";
import { provider, reauthorize } from "./lib/oauth";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { usePullRequestsWithAgentSessions } from "./hooks/usePullRequestsWithAgentSessions";
import { PullRequestWithAgentSessionsItem } from "./components";

function Command() {
  const { isLoading, pullRequestsWithAgentSessions } = usePullRequestsWithAgentSessions();

  const openPullRequests = pullRequestsWithAgentSessions.filter(
    (pullRequestWithAgentSessions) => pullRequestWithAgentSessions.pullRequest.state === "OPEN",
  );
  const closedPullRequests = pullRequestsWithAgentSessions.filter(
    (pullRequestWithAgentSessions) => pullRequestWithAgentSessions.pullRequest.state !== "OPEN",
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks..."
      actions={
        <ActionPanel>
          <Action
            title="New Task"
            icon={Icon.NewDocument}
            onAction={async () => {
              try {
                await launchCommand({
                  name: "create-task",
                  type: LaunchType.UserInitiated,
                });
              } catch (error) {
                await showFailureToast(error, {
                  title: "Failed to open Create Task",
                });
              }
            }}
          />
          <Action title="Log out" icon={Icon.Logout} onAction={reauthorize} />
        </ActionPanel>
      }
    >
      <List.EmptyView
        icon={{ source: "copilot.svg", tintColor: Color.PrimaryText }}
        title={pullRequestsWithAgentSessions.length === 0 ? "No Tasks Found" : "No Matching Tasks"}
        description={
          pullRequestsWithAgentSessions.length === 0
            ? "Press Return to create your first task"
            : "Try a different search"
        }
      />
      {openPullRequests.length > 0 && (
        <List.Section title="Open">
          {openPullRequests.map((pullRequestWithAgentSessions) => (
            <PullRequestWithAgentSessionsItem
              key={pullRequestWithAgentSessions.key}
              pullRequestWithAgentSessions={pullRequestWithAgentSessions}
            />
          ))}
        </List.Section>
      )}
      {closedPullRequests.length > 0 && (
        <List.Section title="Closed">
          {closedPullRequests.map((pullRequestWithAgentSessions) => (
            <PullRequestWithAgentSessionsItem
              key={pullRequestWithAgentSessions.key}
              pullRequestWithAgentSessions={pullRequestWithAgentSessions}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default withAccessToken(provider)(Command);
