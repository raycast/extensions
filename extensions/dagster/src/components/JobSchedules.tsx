import { ActionPanel, Action, List, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState, useCallback } from "react";
import { JobSchedule, startSchedule, stopSchedule } from "../api";

interface Props {
  jobName: string;
  schedules: JobSchedule[];
  repositoryName: string;
  locationName: string;
}

export default function JobSchedules({ jobName, schedules: initialSchedules, repositoryName, locationName }: Props) {
  const [schedules, setSchedules] = useState(initialSchedules);

  const toggle = useCallback(
    async (schedule: JobSchedule) => {
      const isRunning = schedule.scheduleState.status === "RUNNING";
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: isRunning ? "Stopping schedule..." : "Starting schedule...",
      });
      try {
        if (isRunning) {
          await stopSchedule(schedule.scheduleState.id);
        } else {
          await startSchedule(schedule.name, repositoryName, locationName);
        }
        setSchedules((prev) =>
          prev.map((s) =>
            s.name === schedule.name
              ? { ...s, scheduleState: { ...s.scheduleState, status: isRunning ? "STOPPED" : "RUNNING" } }
              : s,
          ),
        );
        toast.style = Toast.Style.Success;
        toast.title = isRunning ? "Schedule stopped" : "Schedule started";
      } catch (e) {
        toast.style = Toast.Style.Failure;
        toast.title = String(e);
      }
    },
    [repositoryName, locationName],
  );

  return (
    <List navigationTitle={`${jobName} — Schedules`}>
      <List.EmptyView title="No Schedules" description="No schedules configured for this job." />
      {schedules.map((schedule) => {
        const isRunning = schedule.scheduleState.status === "RUNNING";
        return (
          <List.Item
            key={schedule.name}
            icon={{
              source: isRunning ? Icon.CheckCircle : Icon.Circle,
              tintColor: isRunning ? Color.Green : Color.SecondaryText,
            }}
            title={schedule.name}
            subtitle={schedule.cronSchedule}
            accessories={[
              {
                tag: { value: isRunning ? "Active" : "Stopped", color: isRunning ? Color.Green : Color.SecondaryText },
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={isRunning ? "Stop Schedule" : "Start Schedule"}
                  icon={isRunning ? Icon.Stop : Icon.Play}
                  onAction={() => toggle(schedule)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
