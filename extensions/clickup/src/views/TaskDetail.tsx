import { OpenInClickUpAction } from "../components/OpenInClickUpAction";
import { TaskItem } from "../types/tasks.dt";
import { Detail, ActionPanel } from "@raycast/api";

function TaskDetail({ task }: { task: TaskItem }) {
  return task ? (
    <Detail
      navigationTitle={task.name}
      markdown={task.description}
      actions={
        <ActionPanel title="Task Actions">
          <OpenInClickUpAction route={task.url} override />
        </ActionPanel>
      }
    />
  ) : (
    <Detail navigationTitle="Error Loading task" markdown="Something went wrong loading the task" />
  );
}

export { TaskDetail };
