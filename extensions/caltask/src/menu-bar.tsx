import { MenuBarExtra, launchCommand, LaunchType } from "@raycast/api";
import { useState, useEffect } from "react";
import { getCurrentTask, stopCurrentTask } from "./storage";
import { exportToCalendar } from "./calendar";
import { formatDuration, getElapsedTime } from "./utils";
import { Task } from "./types";

export default function MenuBar() {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const task = await getCurrentTask();
      if (!cancelled) {
        setCurrentTask(task);
        if (task && task.isRunning) {
          setElapsedTime(getElapsedTime(task.startTime));
        }
        setIsLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Update elapsed time every second when task is running
    if (currentTask && currentTask.isRunning) {
      setElapsedTime(getElapsedTime(currentTask.startTime));
      const interval = setInterval(() => {
        setElapsedTime(getElapsedTime(currentTask.startTime));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentTask]);

  // loadCurrentTask is now inlined in the useEffect with cancellation support

  async function handleStop() {
    const stoppedTask = await stopCurrentTask();
    if (stoppedTask) {
      // Auto-export if calendar is attached
      if (stoppedTask.calendarName) {
        await exportToCalendar(stoppedTask);
      }
    }
    setCurrentTask(null);
  }

  async function handleOpenTaskTimer() {
    await launchCommand({ name: "task-history", type: LaunchType.UserInitiated });
  }

  // Menu bar title
  const title = currentTask && currentTask.isRunning ? formatDuration(elapsedTime) : undefined;

  return (
    <MenuBarExtra
      icon={currentTask && currentTask.isRunning ? "⏱️" : "⏸️"}
      title={title}
      isLoading={isLoading}
      tooltip={currentTask?.name || "Task Timer"}
    >
      {currentTask && currentTask.isRunning ? (
        <>
          <MenuBarExtra.Section title="Current Task">
            <MenuBarExtra.Item
              title={currentTask.name}
              subtitle={currentTask.calendarName ? `→ ${currentTask.calendarName}` : undefined}
            />
            <MenuBarExtra.Item title={`Elapsed: ${formatDuration(elapsedTime)}`} />
          </MenuBarExtra.Section>

          <MenuBarExtra.Section>
            <MenuBarExtra.Item
              title={currentTask.calendarName ? "Stop & Export to Calendar" : "Stop Timer"}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={handleStop}
            />
          </MenuBarExtra.Section>
        </>
      ) : (
        <MenuBarExtra.Section title="No Active Timer">
          <MenuBarExtra.Item
            title="Start Timer..."
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={handleOpenTaskTimer}
          />
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Task Timer"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={handleOpenTaskTimer}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
