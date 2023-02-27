import React, { useState } from "react";
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
  todaysTimeRecords,
}: {
  task: Task;
  hasActiveTimer: boolean;
  refreshActiveTimer: () => Promise<void>;
  refreshRecords: () => Promise<any>;
  todaysTimeRecords: Array<Array<Task>>;
}) {
  const [timeRecords, setTimeRecords] = useState<Array<any>>(todaysTimeRecords);

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

  const formatMinutes = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const min = minutes % 60;
      return `${hours} ${hours === 1 ? "hour" : "hours"} and ${min} min`;
    }
    return `${minutes} min`;
  };

  const resolveTaskTime = (): string => {
    const taskTimeToday = timeRecords.find((timeRecord) => timeRecord.id === task.id);
    if (taskTimeToday) {
      const { timeInMin } = taskTimeToday;
      return `${formatMinutes(timeInMin)} today, ${formatMinutes(total)} total`;
    }
    if (task.time.recent) {
      const total = Math.floor(task.time.recent / 60);
      return `${formatMinutes(total)} in last 7 days`;
    }
    return "";
  };

  return (
    <List.Item
      id={task.id}
      key={task.id}
      title={task.name}
      subtitle={resolveTaskTime()}
      icon={{ source: Icon.Dot, tintColor: hasActiveTimer ? Color.Green : Color.Gray }}
      actions={
        <ActionPanel>
          {hasActiveTimer ? (
            <ActionPanel.Item title="Stop Active Timer" onAction={disableActiveTimer} />
          ) : (
            <ActionPanel.Item title="Start Timer" onAction={enableTaskTimer} />
          )}
          <PushAction
            title="Submit Custom Time"
            target={
              <TimeSubmitForm
                refreshRecords={async () => {
                  const records = await refreshRecords();
                  setTimeRecords(records);
                }}
                taskId={task.id}
              />
            }
          />
        </ActionPanel>
      }
    />
  );
}
