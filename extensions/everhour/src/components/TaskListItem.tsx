import { List, ActionPanel, PushAction, Icon, Color, showToast, ToastStyle } from "@raycast/api";
import { TimeSubmitForm } from "../views";
import { Task } from "../types";
import { startTaskTimer, stopCurrentTaskTimer } from "../api";
import { createResolvedToast } from "../utils";

export function TaskListItem({
  task,
  hasActiveTimer,
  refreshActiveTimer,
  refreshRecords,
}: {
  task: Task;
  hasActiveTimer: boolean;
  refreshActiveTimer: () => Promise<void>;
  refreshRecords: () => Promise<void>;
}) {
  const enableTaskTimer = async () => {
    const toast = await showToast(ToastStyle.Animated, "Starting timer");
    try {
      const { taskName } = await startTaskTimer(task.id);
      refreshActiveTimer();
      createResolvedToast(toast, "Timer started for " + taskName).success();
    } catch (error) {
      createResolvedToast(toast, "Error starting timer").error();
    }
  };
  const disableActiveTimer = async () => {
    const toast = await showToast(ToastStyle.Animated, "Stopping timer");
    try {
      const { taskName } = await stopCurrentTaskTimer();
      refreshActiveTimer();

      if (taskName) {
        createResolvedToast(toast, "Timer stopped for " + taskName).success();
      } else {
        createResolvedToast(toast, "No active timer").error();
      }
    } catch (error) {
      createResolvedToast(toast, "Error stopping timer").error();
    }
  };

  const resolveTaskTime = (): string => {
    const { timeInMin } = task;
    if (timeInMin >= 60) {
      const hours = Math.floor(timeInMin / 60);
      const min = timeInMin % 60;
      return `${hours} ${hours === 1 ? "hour" : "hours"} and ${min} min`;
    } else {
      return `${timeInMin} min`;
    }
  };

  return (
    <List.Item
      id={task.id}
      key={task.id}
      title={`${task.name} - ${resolveTaskTime()}`}
      subtitle={hasActiveTimer ? "Timer Active" : ""}
      icon={{ source: Icon.Dot, tintColor: Color.Green }}
      actions={
        <ActionPanel>
          <PushAction
            title="Submit Hours"
            target={<TimeSubmitForm refreshRecords={refreshRecords} taskId={task.id} />}
          />
          <ActionPanel.Item title="Start Timer" onAction={enableTaskTimer} />
          <ActionPanel.Item title="Stop Active Timer" onAction={disableActiveTimer} />
        </ActionPanel>
      }
    />
  );
}
