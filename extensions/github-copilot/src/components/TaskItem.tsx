import { ActionPanel, Action, Icon, List, launchCommand, LaunchType, Keyboard } from "@raycast/api";
import { TaskWithPullRequest } from "../services/copilot";
import { getTaskIcon } from "../utils";
import { reauthorize } from "../lib/oauth";

export function TaskItem(
  props: Readonly<{
    taskWithPullRequest: TaskWithPullRequest;
  }>,
) {
  const { task, pullRequest } = props.taskWithPullRequest;
  const title = pullRequest?.title ?? `Task ${task.id}`;
  const subtitle = pullRequest ? `${pullRequest.repository.owner.login}/${pullRequest.repository.name}` : undefined;

  // Construct the task URL: https://github.com/{owner}/{repo}/tasks/{task_id}
  const taskUrl = pullRequest
    ? `https://github.com/${pullRequest.repository.owner.login}/${pullRequest.repository.name}/tasks/${task.id}`
    : undefined;

  return (
    <List.Item
      key={props.taskWithPullRequest.key}
      title={title}
      subtitle={subtitle}
      icon={getTaskIcon(props.taskWithPullRequest)}
      accessories={[
        {
          date: new Date(task.created_at),
          tooltip: `Started at ${new Date(task.created_at).toLocaleString()}`,
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {taskUrl && <Action.OpenInBrowser title="Open" icon={Icon.List} url={taskUrl} />}
            {pullRequest && (
              <Action.OpenInBrowser
                title="Open Pull Request"
                icon={Icon.Code}
                shortcut={Keyboard.Shortcut.Common.Open}
                url={pullRequest.url}
              />
            )}
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
