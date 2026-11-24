import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { startActivity } from "../activities/api";
import { ActivityStart } from "../activities/components/ActivityStart";
import { Task } from "../tasks/types";
import { localDate } from "../activities/utils";
import { finishMenuBarForm } from "../../utils/refresh";
import { removeStatus, setStatus, StatusType } from "../../utils/storage";

// Actions for a task, opened by a right-click on a task row in the menu bar.
export const TaskActions = ({ task, isFavorite }: { task: Task; isFavorite: boolean }) => {
  const start = async () => {
    const today = localDate();
    const success = await startActivity({
      date: today,
      description: task.name,
      hours: "",
      projectID: task.projectID,
      taskID: task.id,
    });
    if (success === true) {
      await finishMenuBarForm();
    }
  };

  const changeStatus = async (status: StatusType | undefined) => {
    if (status === undefined) {
      await removeStatus("task", task.id);
    } else {
      await setStatus("task", task.id, status);
    }
    await finishMenuBarForm();
  };

  return (
    <List navigationTitle={`${task.projectName} / ${task.name}`} searchBarPlaceholder="Filter actions...">
      <List.Item
        icon={Icon.Play}
        title="Start"
        subtitle="Description = task name"
        actions={
          <ActionPanel>
            <Action title="Start" icon={Icon.Play} onAction={start} />
          </ActionPanel>
        }
      />
      <List.Item
        icon={Icon.Pencil}
        title="Start with Description…"
        actions={
          <ActionPanel>
            <Action.Push
              title="Start with Description…"
              icon={Icon.Pencil}
              target={<ActivityStart task={task} onSubmitted={finishMenuBarForm} />}
            />
          </ActionPanel>
        }
      />
      {isFavorite ? (
        <List.Item
          icon={Icon.StarDisabled}
          title="Remove from Favorites"
          actions={
            <ActionPanel>
              <Action title="Remove from Favorites" icon={Icon.StarDisabled} onAction={() => changeStatus(undefined)} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Item
          icon={Icon.Star}
          title="Set to Favorite"
          actions={
            <ActionPanel>
              <Action title="Set to Favorite" icon={Icon.Star} onAction={() => changeStatus(StatusType.favorite)} />
            </ActionPanel>
          }
        />
      )}
      <List.Item
        icon={Icon.EyeDisabled}
        title="Hide Task"
        actions={
          <ActionPanel>
            <Action title="Hide Task" icon={Icon.EyeDisabled} onAction={() => changeStatus(StatusType.hidden)} />
          </ActionPanel>
        }
      />
    </List>
  );
};
