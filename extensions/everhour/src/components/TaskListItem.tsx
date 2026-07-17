import React, { useState } from "react";
import { List, ActionPanel, Icon, Color, showToast, Action, Toast } from "@raycast/api";
import { TimeSubmitForm } from "../views";
import { Task } from "../types";
import { startTaskTimer, stopCurrentTaskTimer } from "../api";
import { createResolvedToast } from "../utils";

const formatSeconds = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const min = minutes % 60;
    return `${hours} ${hours === 1 ? "hour" : "hours"} and ${min} min`;
  }
  return `${minutes} min`;
};

export function TaskListItem({
  task,
  hasActiveTimer,
  refreshActiveTimer,
  refreshRecords,
  recentTimeRecords = [],
}: {
  task: Task;
  hasActiveTimer: boolean;
  refreshActiveTimer: () => Promise<void>;
  refreshRecords: () => Promise<Array<Task>>;
  recentTimeRecords?: Array<Task>;
}) {
  const [timeRecords, setTimeRecords] = useState<Array<Task>>(recentTimeRecords);

  const enableTaskTimer = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting Timer",
    });
    try {
      const { taskName } = await startTaskTimer(task.id);
      refreshActiveTimer();
      createResolvedToast(toast, "Timer started for " + taskName).success();
    } catch (error) {
      createResolvedToast(toast, "Error Starting Timer").error();
    }
  };
  const disableActiveTimer = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Stopping Timer",
    });
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
    if (task.time?.recent > 0) {
      return `${formatSeconds(task.time.recent)} in the last 7 days`;
    }
    const record = timeRecords.find((timeRecord) => timeRecord.id === task.id);
    if (record && record.time.recent > 0) {
      return `${formatSeconds(record.time.recent)} in the last 7 days`;
    }
    return "";
  };

  return (
    <List.Item
      id={task.id}
      key={task.id}
      title={task.name}
      subtitle={resolveTaskTime()}
      icon={{ source: Icon.Dot, tintColor: hasActiveTimer ? Color.Green : Color.SecondaryText }}
      actions={
        <ActionPanel>
          {hasActiveTimer ? (
            <Action
              icon={{ source: Icon.Stop, tintColor: Color.Red }}
              title="Stop Active Timer"
              onAction={disableActiveTimer}
            />
          ) : (
            <Action
              icon={{ source: Icon.Play, tintColor: Color.Green }}
              title="Start Timer"
              onAction={enableTaskTimer}
            />
          )}
          <Action.Push
            icon={Icon.Clock}
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
