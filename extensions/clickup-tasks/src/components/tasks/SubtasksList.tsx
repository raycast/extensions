import { ActionPanel, Icon, List } from "@raycast/api";
import { useTasksContext } from "../../contexts/TasksContext";
import { ClickUpTask } from "../../types/clickup";
import { buildTaskAccessories } from "../../utils/format-helpers";
import { getSubtasks } from "../../utils/task-helpers";
import { CopyId, CopyUrl } from "../actions/CopyActions";
import { ShowTaskDetails, GoToParentTask } from "../actions/NavigationActions";
import { OpenInClickUp } from "../actions/OpenInClickUp";
import { NextStatus, ChangeStatus } from "../actions/StatusActions";

interface Props {
  parentTask: ClickUpTask;
}

export function SubtasksList({ parentTask }: Props) {
  const { tasks: allTasks } = useTasksContext();
  const subtasks = getSubtasks(parentTask, allTasks);
  return (
    <List navigationTitle={`Subtasks of: ${parentTask.name}`}>
      {subtasks.map((subtask) => (
        <List.Item
          accessories={buildTaskAccessories(subtask)}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Navigation">
                <ShowTaskDetails task={subtask} />
                <GoToParentTask task={parentTask} />
                <OpenInClickUp url={subtask.url} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Status">
                <NextStatus task={subtask} />
                <ChangeStatus task={subtask} />
              </ActionPanel.Section>
              <ActionPanel.Section title="Copy">
                <CopyUrl url={subtask.url} />
                <CopyId id={subtask.id} />
              </ActionPanel.Section>
            </ActionPanel>
          }
          icon={Icon.Minus}
          key={subtask.id}
          title={subtask.name}
        />
      ))}
    </List>
  );
}
