import { ActionPanel, Action, Icon, List, launchCommand, LaunchType, Keyboard } from "@raycast/api";
import { TaskWithPullRequest } from "../services/copilot";
import { getTaskIcon, formatRelativeDate } from "../utils";
import { reauthorize } from "../lib/oauth";
import { useMemo } from "react";

export function TaskItem(
  props: Readonly<{
    taskWithPullRequest: TaskWithPullRequest;
  }>,
) {
  const { task, pullRequest, premiumRequests, repository } = props.taskWithPullRequest;
  const title = pullRequest?.title ?? task.name ?? `Task ${task.id}`;
  const subtitle = repository ? `${repository.owner.login}/${repository.name}` : undefined;

  // Construct the task URL: https://github.com/{owner}/{repo}/tasks/{task_id}
  const taskUrl = repository
    ? `https://github.com/${repository.owner.login}/${repository.name}/tasks/${task.id}`
    : undefined;

  const createdAt = useMemo(() => new Date(task.created_at), [task.created_at]);
  const relativeDate = useMemo(() => formatRelativeDate(createdAt), [createdAt]);
  const premiumRequestsConsumed = useMemo(() => premiumRequests > 0, [premiumRequests]);

  return (
    <List.Item
      key={props.taskWithPullRequest.key}
      title={title}
      subtitle={subtitle}
      icon={getTaskIcon(props.taskWithPullRequest)}
      accessories={[
        {
          icon: premiumRequestsConsumed ? Icon.Bolt : undefined,
          text: premiumRequestsConsumed ? `${premiumRequests} · ${relativeDate}` : relativeDate,
          tooltip: premiumRequestsConsumed
            ? `${premiumRequests} premium requests · Started at ${createdAt.toLocaleString()}`
            : `Started at ${createdAt.toLocaleString()}`,
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
