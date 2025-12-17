import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ClickUpTask } from "../../types/clickup";
import { TaskDetail } from "../TaskDetail";
import { OpenInClickUpAction } from "../../components/OpenInClickUpAction";

interface Props {
  task: ClickUpTask;
}

export function Task({ task }: Props) {
  return (
    <List.Item
      key={task.id}
      title={task.name}
      subtitle={task.description?.substring(0, 50) ?? undefined}
      icon={
        task.description
          ? { source: Icon.Document, tintColor: task.priority?.color }
          : { source: Icon.Dot, tintColor: task.priority?.color }
      }
      actions={
        <ActionPanel title="View Actions">
          <Action.Push title="View Task" target={<TaskDetail task={task} />} />
          <OpenInClickUpAction route={task.url} override />
        </ActionPanel>
      }
    />
  );
}
