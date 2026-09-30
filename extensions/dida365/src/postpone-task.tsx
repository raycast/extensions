import { Action, ActionPanel, Form, Icon, Keyboard, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import { describeApiError, updateTask } from "./api/dida365.js";
import { SetupTokenView } from "./components/setup-token-view.js";
import { useOpenTasks } from "./hooks/use-open-tasks.js";
import type { Task } from "./types.js";
import { dateFromPreset, toTaskDatePayload } from "./utils/smart-date.js";
import { filterTasksBySearch, openTasksOnly } from "./utils/task.js";
import { didaTimeZone } from "./utils/timezone.js";

type PostponePreset =
  | "today"
  | "tomorrow"
  | "day_after_tomorrow"
  | "weekend"
  | "monday"
  | "next_week"
  | "none"
  | "custom";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { tasks, setTasks, isLoading, needsSetup } = useOpenTasks({
    loadErrorTitle: "Failed to load tasks",
    filterTasks: openTasksOnly,
  });

  const filteredTasks = useMemo(() => filterTasksBySearch(tasks, searchText), [searchText, tasks]);

  async function postponeTask(
    task: Task,
    preset: PostponePreset,
    customDate?: string,
    customTime?: string,
  ): Promise<boolean> {
    const result = dateFromPreset(preset, customDate, customTime);
    const payload = toTaskDatePayload(result);
    const clearing = preset === "none";
    const timeZone = didaTimeZone();
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating task date...",
    });

    if (preset === "custom" && !result.date) {
      toast.style = Toast.Style.Failure;
      toast.title = "Invalid custom date";
      toast.message = "Use 2026-05-24, 05-24, 明天, or 周一";
      return false;
    }

    try {
      await updateTask({
        ...task,
        dueDate: clearing ? null : payload.dueDate,
        startDate: clearing ? null : task.startDate,
        isAllDay: clearing ? null : payload.isAllDay,
        timeZone,
      });
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                dueDate: clearing ? undefined : payload.dueDate,
                startDate: clearing ? undefined : item.startDate,
                isAllDay: clearing ? undefined : payload.isAllDay,
              }
            : item,
        ),
      );
      toast.style = Toast.Style.Success;
      toast.title = "Task date updated";
      return true;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to update task";
      toast.message = describeApiError(error);
      return false;
    }
  }

  if (needsSetup) {
    return <SetupTokenView />;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search task to postpone..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {filteredTasks.map((task) => (
        <PostponeTaskItem key={`postpone:${task.projectId}:${task.id}`} task={task} onPostpone={postponeTask} />
      ))}
    </List>
  );
}

function PostponeTaskItem({
  task,
  onPostpone,
}: {
  task: Task;
  onPostpone: (task: Task, preset: PostponePreset, customDate?: string, customTime?: string) => Promise<boolean>;
}) {
  return (
    <List.Item
      icon={Icon.Calendar}
      title={task.title}
      subtitle={task.dueDate ?? "No date"}
      actions={
        <ActionPanel>
          <Action title="Today" icon={Icon.Calendar} onAction={() => onPostpone(task, "today")} />
          <Action title="Tomorrow" icon={Icon.Calendar} onAction={() => onPostpone(task, "tomorrow")} />
          <Action
            title="Day After Tomorrow"
            icon={Icon.Calendar}
            onAction={() => onPostpone(task, "day_after_tomorrow")}
          />
          <Action title="This Weekend" icon={Icon.Calendar} onAction={() => onPostpone(task, "weekend")} />
          <Action title="Next Monday" icon={Icon.Calendar} onAction={() => onPostpone(task, "monday")} />
          <Action title="Next Week" icon={Icon.Calendar} onAction={() => onPostpone(task, "next_week")} />
          <Action.Push
            title="Custom Date and Time"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<CustomPostponeForm task={task} onPostpone={onPostpone} />}
          />
          <Action
            title="Clear Due Date"
            icon={Icon.XMarkCircle}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => onPostpone(task, "none")}
          />
        </ActionPanel>
      }
    />
  );
}

function CustomPostponeForm({
  task,
  onPostpone,
}: {
  task: Task;
  onPostpone: (task: Task, preset: PostponePreset, customDate?: string, customTime?: string) => Promise<boolean>;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { customDate: string; customTime?: string }) {
    const success = await onPostpone(task, "custom", values.customDate, values.customTime);
    if (success) {
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Date" shortcut={Keyboard.Shortcut.Common.Save} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="customDate" title="Date" placeholder="2026-05-24, 05-24, 明天, 周一" />
      <Form.TextField id="customTime" title="Time" placeholder="09:30, 上午9点, 下午3点" />
    </Form>
  );
}
