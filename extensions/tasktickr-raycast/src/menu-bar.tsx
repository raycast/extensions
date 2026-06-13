import {
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { api } from "./lib/api";
import type { Task } from "./lib/types";

function isDueToday(task: Task, now: Date): boolean {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  return due <= endOfDay; // overdue counts as due today
}

function dueTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MenuBar() {
  const { data, isLoading, revalidate } = useCachedPromise(
    () =>
      api<Task[]>("/api/tasks?parentId=null").then((ts) =>
        ts.filter((t) => t.status !== "DONE"),
      ),
    [],
    { initialData: [] },
  );

  const now = new Date();
  const dueToday = (data ?? []).filter((t) => isDueToday(t, now));

  async function complete(task: Task) {
    try {
      await api(`/api/tasks/${task.id}/complete`, { method: "POST" });
      revalidate();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to complete task",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={Icon.CheckCircle}
      title={dueToday.length > 0 ? String(dueToday.length) : undefined}
      tooltip="TaskTickr — tasks due today"
    >
      <MenuBarExtra.Section
        title={dueToday.length ? "Due Today" : "Nothing due today"}
      >
        {dueToday.map((t) => (
          <MenuBarExtra.Submenu
            key={t.id}
            title={`${t.title}${t.dueDate ? ` — ${dueTime(t.dueDate)}` : ""}`}
          >
            <MenuBarExtra.Item
              title="Complete"
              icon={Icon.CheckCircle}
              onAction={() => complete(t)}
            />
            <MenuBarExtra.Item
              title="Open in My Tasks"
              icon={Icon.AppWindowList}
              onAction={() =>
                launchCommand({
                  name: "my-tasks",
                  type: LaunchType.UserInitiated,
                })
              }
            />
          </MenuBarExtra.Submenu>
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open My Tasks"
          icon={Icon.List}
          onAction={() =>
            launchCommand({ name: "my-tasks", type: LaunchType.UserInitiated })
          }
        />
        <MenuBarExtra.Item
          title="Add Task"
          icon={Icon.Plus}
          onAction={() =>
            launchCommand({ name: "add-task", type: LaunchType.UserInitiated })
          }
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={() => revalidate()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
