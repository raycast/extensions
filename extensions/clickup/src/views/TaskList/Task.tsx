import { ActionPanel, Icon, List, PushAction } from "@raycast/api";
import { TaskItem } from "../../types/tasks.dt";
import { TaskDetail } from "../TaskDetail";

export const Task = ({ task }: { task: TaskItem }) => (
  <List.Item
    key={task.id}
    title={task.name}
    subtitle={task.description?.substring(0, 50)}
    icon={
      task.description
        ? { source: Icon.TextDocument, tintColor: task.priority?.color }
        : { source: Icon.Dot, tintColor: task.priority?.color }
    }
    actions={
      <ActionPanel title="View Actions">
        <PushAction title="View Task" target={<TaskDetail task={task} />} />
      </ActionPanel>
    }
  />
);
