import { ActionPanel, Action, Icon, List, launchCommand, LaunchType, Keyboard } from "@raycast/api";
import { TaskWithPullRequest } from "../services/copilot";
import { getTaskIcon } from "../utils";
import { reauthorize } from "../lib/oauth";

export function TaskItem(
  props: Readonly<{
    taskWithPullRequest: TaskWithPullRequest;
  }>,
) {
  const { task, pullRequest, repository } = props.taskWithPullRequest;
  const title = pullRequest?.title ?? task.name ?? `Task ${task.id}`;
  const subtitle = repository ? `${repository.owner.login}/${repository.name}` : undefined;

  // Construct the task URL: https://github.com/{owner}/{repo}/tasks/{task_id}
  const taskUrl = repository
    ? `https://github.com/${repository.owner.login}/${repository.name}/tasks/${task.id}`
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
