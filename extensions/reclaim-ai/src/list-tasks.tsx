import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useMemo, useState } from "react";

import { useTask } from "./hooks/useTask";
import { useUser } from "./hooks/useUser";
import { Task, TaskStatus } from "./types/task";
import { TIME_BLOCK_IN_MINUTES, formatPriority, formatPriorityIcon, formatStrDuration } from "./utils/dates";

type DropdownStatus = "OPEN" | "DONE";

const DROPDOWN_STATUS: Record<DropdownStatus, string> = {
  OPEN: "Open",
  DONE: "Done",
};

const TASK_GROUP_LABEL: Record<TaskStatus, string> = {
  ARCHIVED: "Archived",
  COMPLETE: "Complete",
  IN_PROGRESS: "In Progress",
  CANCELLED: "Cancelled",
  NEW: "New",
  SCHEDULED: "Scheduled",
};

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

function TaskList() {
  const [selectedStatus, setSelectedStatus] = useState<DropdownStatus | undefined>();
  const { currentUser } = useUser();
  const defaults = useMemo(
    () => ({
      schedulerVersion: currentUser?.features.scheduler || 14,
    }),
    [currentUser]
  );

  const { useFetchTasks, addTime, updateTask, doneTask, incompleteTask } = useTask();

  const { data: tasksData, isLoading } = useFetchTasks();
  const [tasks, setTasks] = useState<Task[]>(tasksData ?? []);

  // Add time to task function
  const handleAddTime = async (task: Task, time: number) => {
    await showToast(Toast.Style.Animated, "Adding time...");
    try {
      await addTime(task, time);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error while updating time", message: String(error) });
      return;
    }
    // optimistic update
    const updatedTime = task.timeChunksRemaining + time / TIME_BLOCK_IN_MINUTES;
    setTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? { ...t, timeChunksRemaining: updatedTime } : t)));
    showToast(Toast.Style.Success, `Added ${formatStrDuration(time + "m")} to "${task.title}" successfully!`);
  };

  // Set task to done
  const handleDoneTask = async (task: Task) => {
    await showToast(Toast.Style.Animated, "Updating task...");
    try {
      await doneTask(task);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error while updating task", message: String(error) });
      return;
    }
    // optimistic update
    setTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? { ...t, status: "ARCHIVED" } : t)));
    showToast(Toast.Style.Success, `Task '${task.title}' marked done. Nice work!`);
  };

  // Set task to incomplete
  const handleIncompleteTask = async (task: Task) => {
    await showToast(Toast.Style.Animated, "Updating task...");
    try {
      await incompleteTask(task);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error while updating task", message: String(error) });
      return;
    }
    // optimistic update
    setTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? { ...t, status: "NEW" } : t)));
    showToast(Toast.Style.Success, `Task '${task.title}' marked incomplete!`);
  };

  // Update tasks
  const handleUpdateTask = async (task: Partial<Task>, payload: Partial<Task>) => {
    await showToast(Toast.Style.Animated, `Updating '${task.title}'...`);
    try {
      await updateTask(task, payload);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: `Error while updating '${task.title}'!`, message: String(error) });
      return;
    }
    // optimistic update
    setTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? { ...t, ...payload } : t)));
    showToast(Toast.Style.Success, `Updated '${task.title}'!`);
  };

  // Filter tasks by status
  const filteredTasks = useMemo(() => {
    if (selectedStatus === "DONE") {
      return tasks.filter((task) => task.status === "ARCHIVED");
    }
    return tasks.filter((task) => task.status !== "ARCHIVED");
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

    if (task.status !== "ARCHIVED" && task.atRisk) {
      list.push({
        tag: {
          value: "",
          color: Color.Red,
        },
        icon: Icon.ExclamationMark,
        tooltip: "Task at risk!",
      });
    }

    if (defaults.schedulerVersion > 14) {
      if (task.onDeck) {
        list.push({
          tag: {
            value: "",
            color: Color.Yellow,
          },
          tooltip: "Task is Up Next",
          icon: Icon.ArrowNe,
        });
      }
      list.push({
        tag: {
          value: "",
          color: Color.PrimaryText,
        },
        tooltip: "Priority: " + formatPriority(task.priority),
        icon: formatPriorityIcon(task.priority),
      });
    }

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
          value: formatStrDuration(task.timeChunksSpent * TIME_BLOCK_IN_MINUTES + "m"),
          color: Color.PrimaryText,
        },
        tooltip: "Time spent",
        icon: Icon.Stopwatch,
      });
    }

    if (task.status !== "ARCHIVED" && task.timeChunksRemaining) {
      list.push({
        tag: {
          value: formatStrDuration(task.timeChunksRemaining * TIME_BLOCK_IN_MINUTES + "m"),
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
          const statusOrder: TaskStatus[] = ["IN_PROGRESS", "SCHEDULED", "NEW", "COMPLETE", "CANCELLED", "ARCHIVED"];
          return statusOrder.indexOf(statusA as TaskStatus) - statusOrder.indexOf(statusB as TaskStatus);
        })
        .map(([status, tasks]) => {
          if (status === "ARCHIVED") {
            tasks.sort((b, a) => new Date(a.due).getTime() - new Date(b.due).getTime());
          }
          return (
            <List.Section
              key={status}
              title={TASK_GROUP_LABEL[status as TaskStatus]}
              subtitle={`${tasks.length} task${tasks.length > 1 ? "s" : ""}`}
            >
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
                      {task.status !== "ARCHIVED" && (
                        <>
                          {defaults.schedulerVersion > 14 && (
                            <ActionPanel.Submenu
                              title="Change Priority"
                              icon={{ source: Icon.Signal1 }}
                              shortcut={{ modifiers: ["cmd"], key: "i" }}
                            >
                              <Action
                                icon={{ source: Icon.FullSignal }}
                                title="Critical"
                                onAction={() => {
                                  const payload = { priority: "P1" };
                                  handleUpdateTask(task, payload);
                                }}
                              />

                              <Action
                                icon={{ source: Icon.Signal3 }}
                                title="High Priority"
                                onAction={() => {
                                  const payload = { priority: "P2" };
                                  handleUpdateTask(task, payload);
                                }}
                              />

                              <Action
                                icon={{ source: Icon.Signal2 }}
                                title="Medium Priority"
                                onAction={() => {
                                  const payload = { priority: "P3" };
                                  handleUpdateTask(task, payload);
                                }}
                              />
                              <Action
                                icon={{ source: Icon.Signal1 }}
                                title="Low Priority"
                                onAction={() => {
                                  const payload = { priority: "P4" };
                                  handleUpdateTask(task, payload);
                                }}
                              />
                            </ActionPanel.Submenu>
                          )}
                          <ActionPanel.Submenu
                            title="Add Time"
                            icon={{ source: Icon.Stopwatch }}
                            shortcut={{ modifiers: ["cmd"], key: "t" }}
                          >
                            <Action
                              icon={{ source: Icon.Circle }}
                              title="Add 15min"
                              onAction={() => {
                                const time = 15;
                                handleAddTime(task, time);
                              }}
                            />
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
                            title="Set Due Date"
                            shortcut={{ modifiers: ["cmd"], key: "d" }}
                            onChange={(date: Date | null) => {
                              if (date) {
                                const payload = { due: date.toISOString() };
                                handleUpdateTask(task, payload);
                              }
                            }}
                          />
                          {task.onDeck ? (
                            <Action
                              icon={{ source: Icon.ArrowDown, tintColor: Color.Red }}
                              title="Remove From Up Next"
                              onAction={() => {
                                const payload = { onDeck: false };
                                handleUpdateTask(task, payload);
                              }}
                            />
                          ) : (
                            <Action
                              icon={{ source: Icon.ArrowNe, tintColor: Color.Yellow }}
                              title="Send to Up Next"
                              onAction={() => {
                                const payload = { onDeck: true };
                                handleUpdateTask(task, payload);
                              }}
                            />
                          )}
                          <Action
                            icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
                            title="Mark as Done"
                            onAction={() => {
                              handleDoneTask(task);
                            }}
                          />
                        </>
                      )}
                      <Action.OpenInBrowser
                        title="Open Task in Browser"
                        url={`https://app.reclaim.ai/tasks/${task.id}`}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      {task.status === "ARCHIVED" && (
                        <Action
                          icon={Icon.Undo}
                          title="Mark Incomplete"
                          onAction={() => {
                            handleIncompleteTask(task);
                          }}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })}
    </List>
  );
}

export default function Command() {
  return <TaskList />;
}
