import { Action, ActionPanel, Alert, Color, Icon, Toast, confirmAlert, showToast, Keyboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { nextMonday, nextSaturday } from "date-fns";
import { DueInput, Project, Task, closeTask, deleteTask, getTaskUrl, moveTask, reopenTask, updateTask } from "../api";
import { colorHex } from "../helpers/colors";
import { addDays, displayDate, toIsoDate } from "../helpers/dates";
import { priorities } from "../helpers/priorities";
import { refreshMenuBar } from "../hooks/useData";
import TaskDetail from "./TaskDetail";
import TaskForm from "./TaskForm";

type TaskActionsProps = {
  task: Task;
  today: string;
  mutate: () => Promise<unknown>;
  projects?: Project[];
  isDetail?: boolean;
  onDeleted?: () => void;
};

export default function TaskActions({ task, today, mutate, projects, isDetail, onDeleted }: TaskActionsProps) {
  async function run(
    animatedTitle: string,
    action: () => Promise<unknown>,
    successTitle: string,
    failureTitle: string,
    successMessage?: string,
  ) {
    await showToast({ style: Toast.Style.Animated, title: animatedTitle });
    try {
      await action();
      await mutate();
      await refreshMenuBar();
      await showToast({ style: Toast.Style.Success, title: successTitle, message: successMessage });
    } catch (error) {
      await showFailureToast(error, { title: failureTitle });
    }
  }

  async function complete() {
    await showToast({ style: Toast.Style.Animated, title: "Completing task" });
    try {
      const updated = await closeTask(task.id);
      await mutate();
      await refreshMenuBar();
      if (!updated.completed_at && updated.due) {
        await showToast({
          style: Toast.Style.Success,
          title: "Completed",
          message: `Next occurrence: ${displayDate(updated.due.date, today)}`,
        });
      } else {
        await showToast({ style: Toast.Style.Success, title: "Completed task" });
      }
    } catch (error) {
      await showFailureToast(error, { title: "Unable to complete task" });
    }
  }

  async function schedule(date: string | null, label: string) {
    // Preserve an existing due time when only the date changes.
    const due: DueInput = date ? (task.due?.time ? { date, time: task.due.time } : { date }) : null;
    await run("Scheduling task", () => updateTask(task.id, { due }), `Scheduled: ${label}`, "Unable to schedule task");
  }

  async function setPriority(value: 1 | 2 | 3 | 4, name: string) {
    await run(
      "Changing priority",
      () => updateTask(task.id, { priority: value }),
      `Changed priority to ${name}`,
      "Unable to change priority",
    );
  }

  async function move(project: Project) {
    await run(
      "Moving task",
      () => moveTask(task.id, project.id),
      `Moved to ${project.is_inbox ? "Inbox" : project.name}`,
      "Unable to move task",
    );
  }

  async function remove() {
    const confirmed = await confirmAlert({
      title: "Delete Task",
      message: `Are you sure you want to delete "${task.content}"?`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await showToast({ style: Toast.Style.Animated, title: "Deleting task" });
    try {
      await deleteTask(task.id);
      await mutate();
      await refreshMenuBar();
      await showToast({ style: Toast.Style.Success, title: "Deleted task" });
      onDeleted?.();
    } catch (error) {
      await showFailureToast(error, { title: "Unable to delete task" });
    }
  }

  async function reopen() {
    await run("Reopening task", () => reopenTask(task.id), "Reopened task", "Unable to reopen task");
  }

  if (task.completed_at) {
    return (
      <>
        <ActionPanel.Section>
          <Action title="Reopen Task" icon={Icon.ArrowCounterClockwise} onAction={reopen} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.OpenInBrowser
            title="Open in OpenTask"
            url={getTaskUrl(task.id)}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy Task Title"
            content={task.content}
            shortcut={Keyboard.Shortcut.Common.CopyName}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action
            title="Delete Task"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={remove}
          />
          <Action
            title="Refresh Data"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => mutate()}
          />
        </ActionPanel.Section>
      </>
    );
  }

  return (
    <>
      <ActionPanel.Section>
        {!isDetail ? (
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<TaskDetail task={task} today={today} mutate={mutate} />}
          />
        ) : null}
        <Action
          title="Complete Task"
          icon={Icon.Checkmark}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "e" },
            Windows: { modifiers: ["ctrl", "shift"], key: "e" },
          }}
          onAction={complete}
        />
        <Action.Push
          title="Edit Task"
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          target={<TaskForm task={task} mutate={mutate} />}
        />
        {!task.due?.is_recurring ? (
          <ActionPanel.Submenu title="Schedule Task" icon={Icon.Calendar} shortcut={Keyboard.Shortcut.Common.Duplicate}>
            <Action title="Today" icon={Icon.Calendar} onAction={() => schedule(today, "Today")} />
            <Action title="Tomorrow" icon={Icon.Sunrise} onAction={() => schedule(addDays(today, 1), "Tomorrow")} />
            <Action
              title="This Weekend"
              icon={Icon.ArrowClockwise}
              onAction={() => schedule(toIsoDate(nextSaturday(new Date(`${today}T00:00:00`))), "This Weekend")}
            />
            <Action
              title="Next Week"
              icon={Icon.Calendar}
              onAction={() => schedule(toIsoDate(nextMonday(new Date(`${today}T00:00:00`))), "Next Week")}
            />
            <Action.PickDate
              title="Pick a Date…"
              type={Action.PickDate.Type.Date}
              onChange={(date) => schedule(date ? toIsoDate(date) : null, date ? toIsoDate(date) : "No Due Date")}
            />
            {task.due ? (
              <Action title="Remove Due Date" icon={Icon.XMarkCircle} onAction={() => schedule(null, "No Due Date")} />
            ) : null}
          </ActionPanel.Submenu>
        ) : null}
        <ActionPanel.Submenu
          title="Change Priority"
          icon={Icon.LevelMeter}
          shortcut={{
            macOS: { modifiers: ["cmd", "shift"], key: "p" },
            Windows: { modifiers: ["ctrl", "shift"], key: "p" },
          }}
        >
          {priorities.map((priority) => (
            <Action
              key={priority.value}
              title={priority.name}
              icon={{ source: Icon.CircleFilled, tintColor: priority.color }}
              onAction={() => setPriority(priority.value, priority.name)}
            />
          ))}
        </ActionPanel.Submenu>
        {projects && projects.length > 1 ? (
          <ActionPanel.Submenu
            title="Move to Project"
            icon={Icon.Folder}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "m" },
              Windows: { modifiers: ["ctrl", "shift"], key: "m" },
            }}
          >
            {projects
              .filter((project) => project.id !== task.project_id)
              .map((project) => (
                <Action
                  key={project.id}
                  title={project.is_inbox ? "Inbox" : project.name}
                  icon={
                    project.is_inbox ? Icon.Tray : { source: Icon.CircleFilled, tintColor: colorHex(project.color) }
                  }
                  onAction={() => move(project)}
                />
              ))}
          </ActionPanel.Submenu>
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          title="Open in OpenTask"
          url={getTaskUrl(task.id)}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
        <Action.CopyToClipboard
          title="Copy Task Title"
          content={task.content}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        <Action.CopyToClipboard
          title="Copy Task URL"
          content={getTaskUrl(task.id)}
          shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Delete Task"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={remove}
        />
        <Action
          title="Refresh Data"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => mutate()}
        />
      </ActionPanel.Section>
    </>
  );
}
