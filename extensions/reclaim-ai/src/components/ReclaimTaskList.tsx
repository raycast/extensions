import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useCallbackSafeRef } from "../hooks/useCallbackSafeRef";
import { useReclaimTaskActions, useReclaimTasks } from "../hooks/useReclaimTask";
import { ReclaimTask } from "../types/reclaim-task";
import { formatPriority, formatPriorityIcon } from "../utils/dates";

// Leaner Reclaim 2.0 ("Assistant") task list. The 2.0 /reclaim-tasks model has
// no time-chunk / instance / up-next data, so this view is intentionally
// reduced compared to the 1.0 TaskList: title, priority, due, and
// complete/incomplete + open actions.

type DropdownStatus = "OPEN" | "DONE";

const DROPDOWN_STATUS: Record<DropdownStatus, string> = {
  OPEN: "Open",
  DONE: "Done",
};

const STATUS_TYPES: readonly DropdownStatus[] = ["OPEN", "DONE"];

type StatusDropdownProps = {
  onStatusChange: (newValue: DropdownStatus) => void;
};

const StatusDropdown = ({ onStatusChange }: StatusDropdownProps) => (
  <List.Dropdown
    tooltip="Select Status"
    storeValue={true}
    onChange={(value) => onStatusChange(value as DropdownStatus)}
  >
    {STATUS_TYPES.map((statusType) => (
      <List.Dropdown.Item key={statusType} title={DROPDOWN_STATUS[statusType]} value={statusType} />
    ))}
  </List.Dropdown>
);

export function ReclaimTaskList() {
  const { tasks: sourceTasks, isLoading } = useReclaimTasks();
  const { doneTask, incompleteTask } = useReclaimTaskActions();

  const [selectedStatus, setSelectedStatus] = useState<DropdownStatus | undefined>();
  const [tasks, setTasks] = useState<ReclaimTask[]>(sourceTasks ?? []);

  useEffect(() => {
    if (sourceTasks) setTasks(sourceTasks);
  }, [sourceTasks]);

  const filteredTasks = useMemo(
    () => tasks.filter((task) => (selectedStatus === "DONE" ? task.completed : !task.completed)),
    [tasks, selectedStatus]
  );

  const handleDoneTask = useCallbackSafeRef(async (task: ReclaimTask) => {
    await showToast(Toast.Style.Animated, "Updating task...");
    try {
      await doneTask(task);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error while updating task", message: String(error) });
      return;
    }
    // optimistic update
    setTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? { ...t, completed: true } : t)));
    showToast(Toast.Style.Success, `Task '${task.title}' marked done. Nice work!`);
  });

  const handleIncompleteTask = useCallbackSafeRef(async (task: ReclaimTask) => {
    await showToast(Toast.Style.Animated, "Updating task...");
    try {
      await incompleteTask(task);
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error while updating task", message: String(error) });
      return;
    }
    // optimistic update
    setTasks((prevTasks) => prevTasks.map((t) => (t.id === task.id ? { ...t, completed: false } : t)));
    showToast(Toast.Style.Success, `Task '${task.title}' marked incomplete!`);
  });

  const getListAccessories = useCallbackSafeRef((task: ReclaimTask) => {
    const list: List.Item.Accessory[] = [];

    if (task.priority) {
      list.push({
        tag: { value: "", color: Color.PrimaryText },
        tooltip: "Priority: " + formatPriority(task.priority),
        icon: formatPriorityIcon(task.priority),
      });
    }

    if (task.due) {
      list.push({
        tag: { value: new Date(task.due), color: Color.Red },
        tooltip: "Due date: " + new Date(task.due).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }),
        icon: Icon.Flag,
      });
    }

    return list;
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Search Tasks"
      searchBarPlaceholder="Search tasks"
      searchBarAccessory={<StatusDropdown onStatusChange={setSelectedStatus} />}
    >
      {filteredTasks.map((task) => (
        <List.Item
          key={task.id}
          keywords={task.description ? task.description.split(" ") : undefined}
          icon={task.completed ? Icon.CheckCircle : Icon.Circle}
          title={task.title}
          accessories={getListAccessories(task)}
          actions={
            <ActionPanel>
              {!task.completed && (
                <Action
                  icon={{ source: Icon.Checkmark, tintColor: Color.Green }}
                  title="Mark as Done"
                  onAction={() => handleDoneTask(task)}
                />
              )}
              <Action.OpenInBrowser
                title="Open Task in Browser"
                url={task.link?.url ?? `https://app.reclaim.ai/planner`}
                shortcut={{ modifiers: ["cmd"], key: "o" }}
              />
              {task.completed && (
                <Action icon={Icon.Undo} title="Mark Incomplete" onAction={() => handleIncompleteTask(task)} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
