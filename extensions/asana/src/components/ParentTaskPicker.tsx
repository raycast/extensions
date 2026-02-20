import { useState } from "react";
import { List, Action, ActionPanel, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise } from "@raycast/utils";
import { Task, setTaskParent } from "../api/tasks";
import { useSearchTasks } from "../hooks/useSearchTasks";
import { getErrorMessage } from "../helpers/errors";

type ParentTaskPickerProps = {
  task: Task;
  workspace: string;
  mutateList?: MutatePromise<Task[] | undefined>;
  mutateDetail?: MutatePromise<Task>;
};

export default function ParentTaskPicker({ task, workspace, mutateList, mutateDetail }: ParentTaskPickerProps) {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const { data: tasks, isLoading } = useSearchTasks(workspace, searchText);

  // Filter out the current task from potential parents
  const availableTasks = tasks?.filter((t) => t.gid !== task.gid);

  async function selectParent(parentTask: Pick<Task, "gid" | "name">) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Converting to subtask" });

      const asyncUpdate = setTaskParent(task.gid, parentTask.gid);

      if (mutateList) {
        mutateList(asyncUpdate, {
          optimisticUpdate(data) {
            if (!data) {
              return;
            }
            return data.map((t) =>
              t.gid === task.gid ? { ...t, parent: { gid: parentTask.gid, name: parentTask.name } } : t,
            );
          },
        });
      }

      if (mutateDetail) {
        mutateDetail(asyncUpdate, {
          optimisticUpdate(data) {
            return { ...data, parent: { gid: parentTask.gid, name: parentTask.name } };
          },
        });
      }

      await asyncUpdate;

      await showToast({
        style: Toast.Style.Success,
        title: "Converted to subtask",
        message: `Now a subtask of "${parentTask.name}"`,
      });

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to convert to subtask",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <List
      navigationTitle={`Select parent for "${task.name}"`}
      searchBarPlaceholder="Search for a task..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle
    >
      <List.EmptyView title="No tasks found" description="Try a different search term" />
      {availableTasks?.map((parentTask) => (
        <List.Item
          key={parentTask.gid}
          title={parentTask.name}
          icon={Icon.Circle}
          actions={
            <ActionPanel>
              <Action title="Set as Parent" icon={Icon.ArrowUp} onAction={() => selectParent(parentTask)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
