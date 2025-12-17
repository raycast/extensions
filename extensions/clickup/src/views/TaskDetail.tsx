import { Detail, ActionPanel } from "@raycast/api";
import { ClickUpTask } from "../types/clickup";
import { OpenInClickUpAction } from "../components/OpenInClickUpAction";

interface Props {
  task: ClickUpTask;
}

export function TaskDetail({ task }: Props) {
  if (!task) {
    return <Detail navigationTitle="Error Loading task" markdown="Something went wrong loading the task" />;
  }

  return (
    <Detail
      navigationTitle={task.name}
      markdown={task.description ?? ""}
      actions={
        <ActionPanel title="Task Actions">
          <OpenInClickUpAction route={task.url} override />
        </ActionPanel>
      }
    />
  );
}
