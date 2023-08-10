import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { useTask } from "./hooks/useTask";
import { Task, TaskStatus } from "./types/task";

type DropdownStatus = "OPEN" | "DONE";

const DROPDOWN_STATUS: Record<DropdownStatus, string> = {
  OPEN: "Open",
  DONE: "Done",
} as const;

type StatusDropdownProps = {
  onStatusChange: (newValue: DropdownStatus) => void;
};

const StatusDropdown = (props: StatusDropdownProps) => {
  const { onStatusChange } = props;
  const statusTypes = useMemo<DropdownStatus[]>(() => ["OPEN", "DONE"], []);

  return (
    <List.Dropdown
      tooltip="Select Status"
      storeValue={true}
      onChange={(value) => onStatusChange(value as DropdownStatus)}
    >
      {statusTypes.map((statusType) => (
        <List.Dropdown.Item key={statusType} title={DROPDOWN_STATUS[statusType]} value={statusType} />
      ))}
    </List.Dropdown>
  );
};

// Main Function
function TaskList() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<DropdownStatus | undefined>();
  const [tasks, setTasks] = useState<Task[]>([]);

  const { getAllTasks, addTime, updateTask } = useTask();

  // Get tasks via API
  useEffect(() => {
    const getTasks = async () => {
      try {
        setIsLoading(true);
        const tasks = await getAllTasks();
        setTasks(tasks ? tasks : []);
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
        showToast({
          style: Toast.Style.Success,
          title: "Yay!",
          message: `Added ${time / 60}h to "${task.title}" successfully!`,
        });
      } else {
        throw new Error("Update time request failed!");
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error while adding time!", message: String(error) });
    }
  };

  // Update due date
  const handleUpdateTask = async (task: Task) => {
    await showToast(Toast.Style.Animated, "Updating due date...");
    try {
      const updatedTask = await updateTask(task);
      if (updatedTask) {
        showToast({
          style: Toast.Style.Success,
          title: "Yay!",
          message: `Updated due date for "${task.title}" successfully!`,
        });
      } else {
        throw new Error("Update due date request failed!");
      }
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "D'oh", message: `Error while updating due date!` });
    }
  };

  // Filter tasks by status
  const filteredTasks = useMemo(() => {
    if (selectedStatus === DROPDOWN_STATUS.DONE) {
      return tasks.filter((task) => task.status === "ARCHIVED" || task.status === "COMPLETE");
    }
    return tasks.filter((task) => task.status !== "ARCHIVED" && task.status !== "COMPLETE");
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

  const getListAccessories = (task: Task) => {
    const list = [];

    if (task.status !== "ARCHIVED" && task.snoozeUntil) {
      list.push({
        tag: {
          value: new Date(task.snoozeUntil),
          color: Color.Yellow,
        },
        tooltip:
          "Snoozed until: " +
          new Date(task.snoozeUntil).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          }),
      });
    }

    if (task.status === "ARCHIVED") {
      list.push({
        tag: {
          value: `${task.timeChunksSpent / 4}h`,
          color: Color.PrimaryText,
        },
        tooltip: "Time spent",
        icon: Icon.Stopwatch,
      });
    }

    if (task.status !== "ARCHIVED" && task.timeChunksRemaining) {
      list.push({
        tag: {
          value:
            task.timeChunksRemaining >= 4
              ? 0.25 * task.timeChunksRemaining + "h"
              : 15 * task.timeChunksRemaining + "min",
          color: Color.Green,
        },
        tooltip: "Time left",
        icon: Icon.Stopwatch,
      });
    }

    if (task.due) {
      list.push({
        tag: {
          value: new Date(task.due),
          color: Color.Red,
        },
        tooltip:
          "Due date: " +
          new Date(task.due).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        icon: Icon.Flag,
      });
    }

    return list;
  };

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Tasks"
      searchBarPlaceholder="Search tasks"
      searchBarAccessory={<StatusDropdown onStatusChange={setSelectedStatus} />}
    >
      {Object.entries(groupedTasks)
        .sort(([statusA], [statusB]) => {
          const statusOrder: TaskStatus[] = ["NEW", "INPROGRESS", "SCHEDULED", "COMPLETE", "CANCELLED", "ARCHIVED"];
          return statusOrder.indexOf(statusA as TaskStatus) - statusOrder.indexOf(statusB as TaskStatus);
        })
        .map(([status, tasks]) => (
          <List.Section key={status} title={status} subtitle={`${tasks.length} tasks`}>
            {tasks.map((task: Task) => (
              <List.Item
                key={task.id}
                keywords={task.notes.split(" ")}
                icon={
                  task.status === "ARCHIVED"
                    ? Icon.CheckCircle
                    : task.status === "COMPLETE"
                    ? Icon.CircleProgress100
                    : Icon.Circle
                }
                title={task.title}
                accessories={getListAccessories(task)}
                actions={
                  <ActionPanel>
                    <ActionPanel.Submenu
                      title="Add Time…"
                      icon={{ source: Icon.Stopwatch }}
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                    >
                      <Action
                        icon={{ source: Icon.CircleProgress25 }}
                        title="Add 30min"
                        onAction={() => {
                          const time = 30;
                          handleAddTime(task, time);
                        }}
                      />
                      <Action
                        icon={{ source: Icon.CircleProgress50 }}
                        title="Add 1h"
                        onAction={() => {
                          const time = 60;
                          handleAddTime(task, time);
                        }}
                      />
                      <Action
                        icon={{ source: Icon.CircleProgress75 }}
                        title="Add 2h"
                        onAction={() => {
                          const time = 120;
                          handleAddTime(task, time);
                        }}
                        autoFocus={true}
                      />
                      <Action
                        icon={{ source: Icon.CircleProgress100 }}
                        title="Add 4h"
                        onAction={() => {
                          const time = 240;
                          handleAddTime(task, time);
                        }}
                      />
                    </ActionPanel.Submenu>
                    <Action.PickDate
                      title="Set Due Date…"
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onChange={(date: Date | null) => {
                        if (date) {
                          handleUpdateTask({ ...task, due: date.toISOString() });
                        }
                      }}
                    />
                    <Action.OpenInBrowser
                      title="Open Task in Browser"
                      url={`https://app.reclaim.ai/tasks/${task.id}`}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
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
