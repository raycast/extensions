import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { PveServer, PveTask } from "@/types";
import { getTaskTitle, isTaskRunning } from "@/utils/tasks";
import { getTaskStatusIcon } from "@/utils/ui";
import { TaskLog } from "@/screens/TaskLog";

type TaskListItemProps = {
  server: PveServer;
  task: PveTask;
  revalidate: () => void;
};

export const TaskListItem = ({ server, task, revalidate }: TaskListItemProps) => {
  const status = isTaskRunning(task) ? undefined : task.status;

  return (
    <List.Item
      title={getTaskTitle(task)}
      icon={{ ...getTaskStatusIcon(status), tooltip: status ?? "running" }}
      subtitle={status !== "OK" ? status : undefined}
      keywords={[task.type, task.user, task.node, server.name]}
      accessories={[{ text: task.user }, { date: new Date(task.starttime * 1000) }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Log"
            icon={Icon.Terminal}
            target={<TaskLog server={server} node={task.node} upid={task.upid} />}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
};
