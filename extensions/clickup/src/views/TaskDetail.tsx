import { TaskItem } from "../types/tasks.dt";
import { Detail, OpenInBrowserAction, ActionPanel } from "@raycast/api";

function TaskDetail({ task }: { task: TaskItem }) {
  return task ? (
    <Detail
      navigationTitle={task.name}
      markdown={task.description}
      actions={
        <ActionPanel title="Task Actions">
          <OpenInBrowserAction url={task.url} />
        </ActionPanel>
      }
    />
  ) : (
    <Detail navigationTitle="Error Loading task" markdown="Something went wrong loading the task" />
  );
}

export { TaskDetail };
