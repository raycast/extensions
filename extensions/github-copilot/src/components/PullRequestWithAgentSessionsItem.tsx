import { ActionPanel, Action, Icon, List, launchCommand, LaunchType, Keyboard } from "@raycast/api";
import { PullRequestWithAgentSessions } from "../services/copilot";
import { getIcon } from "../utils";
import { reauthorize } from "../lib/oauth";

export function PullRequestWithAgentSessionsItem(props: {
  pullRequestWithAgentSessions: PullRequestWithAgentSessions;
}) {
  return (
    <List.Item
      key={props.pullRequestWithAgentSessions.key}
      title={props.pullRequestWithAgentSessions.pullRequest.title}
      subtitle={`${props.pullRequestWithAgentSessions.pullRequest.repository.owner.login}/${props.pullRequestWithAgentSessions.pullRequest.repository.name}`}
      icon={getIcon(props.pullRequestWithAgentSessions)}
      accessories={[
        {
          date: new Date(props.pullRequestWithAgentSessions.sessions[0].created_at),
          tooltip: `Started at ${new Date(props.pullRequestWithAgentSessions.sessions[0].created_at).toLocaleString()}`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Open"
              icon={Icon.List}
              url={`https://github.com/copilot/tasks/pull/${props.pullRequestWithAgentSessions.pullRequest.globalId}`}
            />
            <Action.OpenInBrowser
              title="Open Pull Request"
              icon={Icon.Code}
              shortcut={Keyboard.Shortcut.Common.Open}
              url={props.pullRequestWithAgentSessions.pullRequest.url}
            />
          </ActionPanel.Section>
          <Action
            title="Create Task"
            icon={Icon.NewDocument}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={() =>
              launchCommand({
                name: "create-task",
                type: LaunchType.UserInitiated,
              })
            }
          />
          <Action title="Log out" icon={Icon.Logout} onAction={reauthorize} />
        </ActionPanel>
      }
    />
  );
}
