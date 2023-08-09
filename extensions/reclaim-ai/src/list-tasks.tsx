import { ActionPanel, Action, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { useTask } from "./hooks/useTask";
import { Task } from "./types/task";

const OPEN_STATUS = "Open";
const DONE_STATUS = "Marked done";
const COMPLETE_STATUS = "COMPLETE";
const ARCHIVED_STATUS = "ARCHIVED";

// Dropdown Menu for status types
type StatusDropdownProps = {
  tasks: Task[];
  onStatusChange: (newValue: string) => void;
};

const StatusDropdown = (props: StatusDropdownProps) => {
  const { tasks, onStatusChange } = props;
  const statusTypes = useMemo(() => [OPEN_STATUS, DONE_STATUS], []); // define status types

  return (
    <List.Dropdown
      tooltip="Select Status"
      storeValue={true}
      onChange={(newValue) => {
        onStatusChange(newValue ?? "");
      }}
    >
      {statusTypes.map((statusType) => (
        <List.Dropdown.Item key={statusType} title={statusType} value={statusType} />
      ))}
    </List.Dropdown>
  );
};

// Main Function
function TaskList() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const { getAllTasks, addTime, updateTask } = useTask();
  
  // Get tasks via API
  useEffect(() => {
    const getTasks = async () => {
      try {
        setIsLoading(true);
        const tasks = await getAllTasks();
        setTasks(tasks);
      } catch (error) {
        console.error("Error while fetching tasks", error);
      } finally {
        setIsLoading(false);
      }
    };

    void getTasks();
  }, []);

  // Add time to task function
  const handleAddTime = async (task: Task, time: number) => {
    await showToast(Toast.Style.Animated, "Adding time...");
    try {
      const updatedTime = await addTime(task, time);
      if (updatedTime) {
        showToast(Toast.Style.Success, `Added ${time/60}h to "${task.title}" successfully!`);
      } else {
        showToast(Toast.Style.Failure, `Error while adding time!`);
      }
    } catch (error) {
      showToast(Toast.Style.Failure, `Error while adding time!`);
    }
  };

  // Update due date
  const handleUpdateTask = async (task: Task) => {
    await showToast(Toast.Style.Animated, "Updating due date...");
    try {
      const updatedTask = await updateTask(task);
      if (updatedTask) {
        showToast(Toast.Style.Success, `Updated due date for "${task.title}" successfully!`);
      } else {
        showToast(Toast.Style.Failure, `Error while updating due date!`);
      }
    } catch (error) {
      showToast(Toast.Style.Failure, `Error while updating due date!`);
    }
  };


  // Filter tasks by status
  const filteredTasks = useMemo(() => {
    if (selectedStatus === DONE_STATUS) {
      return tasks.filter((task) => task.status === ARCHIVED_STATUS);
    } else if (selectedStatus === OPEN_STATUS) {
      return tasks.filter((task) => task.status !== ARCHIVED_STATUS);
    } else {
      return tasks.filter((task) => task.status === selectedStatus);
    }
  }, [tasks, selectedStatus]);

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};

    filteredTasks.forEach((task) => {
      if (!groups[task.status]) {
        groups[task.status] = [];
      }
      groups[task.status].push(task);
    });

    return groups;
  }, [filteredTasks]);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Tasks"
      searchBarPlaceholder="Search tasks"
      searchBarAccessory={
        <StatusDropdown tasks={tasks} onStatusChange={setSelectedStatus} />
      }
    >
      {Object.entries(groupedTasks)
      .sort(([statusA], [statusB]) => {
        const statusOrder = ["NEW", "IN_PROGRESS", "SCHEDULED", "COMPLETE"];
        return statusOrder.indexOf(statusA) - statusOrder.indexOf(statusB);
      })
      .map(([status, tasks]) => (
        <List.Section key={status} title={status} subtitle={`${tasks.length} tasks`} >
          {tasks.map((task: Task) => (
            <List.Item key={task.id} keywords={task.notes.split(" ")}
              icon={task.status === ARCHIVED_STATUS
                  ? Icon.CheckCircle
                  : task.status === COMPLETE_STATUS
                  ? Icon.CircleProgress100
                  : Icon.Circle
                }
              title={task.title}
              accessories={[
                // Snooze until
                task.status !== ARCHIVED_STATUS && task.snoozeUntil && {
                    tag: {
                      value: new Date(task.snoozeUntil),
                      color: Color.Yellow,
                    },
                    tooltip: "Snoozed until: " + new Date(task.snoozeUntil).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }),
                  },
                // Time spent if task is archived
                task.status === ARCHIVED_STATUS && {
                  tag: {
                    value: `${task.timeChunksSpent / 4}h`,
                    color: Color.PrimaryText,
                  },
                  tooltip: "Time spent",
                  icon: Icon.Stopwatch,
                },
                // Time remaining
                task.status !== ARCHIVED_STATUS && task.timeChunksRemaining && {
                    tag: {
                      value:
                        task.timeChunksRemaining >= 4
                          ? 0.25 * task.timeChunksRemaining + "h"
                          : 15 * task.timeChunksRemaining + "min",
                      color: Color.Green,
                    },
                    tooltip: "Time left",
                    icon: Icon.Stopwatch,
                  },
                // Due date
                task.due && {
                  tag: {
                    value: new Date(task.due),
                    color: Color.Red,
                  },
                  tooltip: "Due date: " + new Date(task.due).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  icon: Icon.Flag,
                },
              ].filter(Boolean)}
              // actions
              actions={
                <ActionPanel>
                  <ActionPanel.Submenu title="Add Time…" icon={{source: Icon.Stopwatch}} shortcut={{ modifiers: ['cmd'], key: 't' }}>
                    <Action icon={{ source: Icon.CircleProgress25}} title="Add 30min" onAction={() => {const time=30; handleAddTime(task, time)}} />
                    <Action icon={{ source: Icon.CircleProgress50}} title="Add 1h" onAction={() => {const time=60; handleAddTime(task, time)}} />
                    <Action icon={{ source: Icon.CircleProgress75}} title="Add 2h" onAction={() => {const time=120; handleAddTime(task, time)}} autoFocus={true} />
                    <Action icon={{ source: Icon.CircleProgress100}} title="Add 4h" onAction={() => {const time=240; handleAddTime(task, time)}} />
                  </ActionPanel.Submenu>
                  <Action.PickDate title="Set Due Date…" shortcut={{ modifiers: ['cmd'], key: 'd' }} onChange={(date: Date) => {task.due=date.toISOString(); handleUpdateTask(task)} } />
                  <Action.OpenInBrowser title="Open task in Reclaim" url={`https://app.reclaim.ai/tasks/${task.id}`} shortcut={{ modifiers: ['cmd'], key: 'o' }} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export default function Command() {
  return <TaskList />;
}

