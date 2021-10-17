import { List, ActionPanel, PushAction, Icon, Color, showToast, ToastStyle } from "@raycast/api";
import { TimeSubmitForm } from "../views";
import { Task } from "../types";
import { startTaskTimer, stopCurrentTaskTimer } from "../api";

export function TaskListItem({
  task,
  hasActiveTimer,
  refreshActiveTimer,
  fetchTasks,
}: {
  task: Task;
  hasActiveTimer: boolean;
  refreshActiveTimer: () => Promise<void>;
  fetchTasks: () => Promise<void>;
}) {
  const enableTaskTimer = async () => {
    try {
      const { taskName } = await startTaskTimer(task.id);
      refreshActiveTimer();
      await showToast(ToastStyle.Success, "Timer started for " + taskName);
    } catch (error) {
      await showToast(ToastStyle.Failure, "Error starting timer");
    }
  };
  const disableActiveTimer = async () => {
    try {
      const { taskName } = await stopCurrentTaskTimer();
      refreshActiveTimer();

      if (taskName) {
        await showToast(ToastStyle.Success, "Timer stopped for " + taskName);
      } else {
        await showToast(ToastStyle.Failure, "No active timer");
      }
    } catch (error) {
      await showToast(ToastStyle.Failure, "Error stopping timer");
    }
  };

  return (
    <List.Item
      id={task.id}
      key={task.id}
      title={`${task.name} - ${task.timeInMin} min` + (hasActiveTimer ? " - Timer Active" : "")}
      icon={{ source: Icon.Dot, tintColor: Color.Green }}
      actions={
        <ActionPanel>
          <PushAction title="Submit Hours" target={<TimeSubmitForm fetchTasks={fetchTasks} taskId={task.id} />} />
          <ActionPanel.Item title="Start Timer" onAction={enableTaskTimer} />
          <ActionPanel.Item title="Stop Active Timer" onAction={disableActiveTimer} />
        </ActionPanel>
      }
    />
  );
}
