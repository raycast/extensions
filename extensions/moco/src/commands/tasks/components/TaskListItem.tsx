import { Action, ActionPanel, Detail, List } from "@raycast/api";
import { Task } from "../types";
import { ActivityStart } from "../../activities/components/ActivityStart";

export const TaskListItem = ({ task }: { task: Task }) => {
  return (
    <List.Item
      key={task.id}
      title={task.name}
      actions={
        <ActionPanel>
          <Action.Push title={"New activity"} target={<ActivityStart task={task} />} />
        </ActionPanel>
      }
    />
  );
};
