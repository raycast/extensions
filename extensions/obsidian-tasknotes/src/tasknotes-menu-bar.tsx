import {
  MenuBarExtra,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  openCommandPreferences,
  launchCommand,
  LaunchType,
  confirmAlert,
  open,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Task, ApiResponse } from "./models/types";
import { getApiUrl, API_ENDPOINTS, getFetchOptions } from "./utils/api";
import { getTodayInLocalTime, isOverdue, isToday, isTomorrow, isThisWeek } from "./utils/dateUtils";
import { getPriorityIcon as getHelperPriorityIcon, getStatusIcon } from "./utils/helpers";
import { addDays, format } from "date-fns";

interface Preferences {
  port: string;
  AuthToken?: string;
}

export default function Command() {
  const { port, AuthToken } = getPreferenceValues<Preferences>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date>();
  const [vaultNameFromAPI, setVaultNameFromAPI] = useState<string>("");

  useEffect(() => {
    fetchTasks();
    // Refresh tasks every 5 minutes
    const interval = setInterval(fetchTasks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [port]);

  const fetchAllTasks = async (): Promise<{ tasks: Task[]; vaultName?: string }> => {
    const PAGE_LIMIT = 200;
    let offset = 0;
    let allTasks: Task[] = [];
    let vaultName: string | undefined;

    while (true) {
      const res = await fetch(
        getApiUrl(port, API_ENDPOINTS.tasks, { limit: PAGE_LIMIT, offset }),
        getFetchOptions("GET", undefined, AuthToken),
      );
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const response = (await res.json()) as ApiResponse;
      if (!response.success) {
        throw new Error(response.error?.message || "Operation failed");
      }
      if (!Array.isArray(response.data?.tasks)) {
        throw new Error("Invalid response format: tasks array not found");
      }
      allTasks = allTasks.concat(response.data.tasks);
      if (response.data.vault?.name) {
        vaultName = response.data.vault.name;
      }
      if (!response.data.pagination?.hasMore) {
        break;
      }
      offset += response.data.pagination.limit;
    }

    return { tasks: allTasks, vaultName };
  };

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const { tasks, vaultName } = await fetchAllTasks();
      setTasks(tasks);
      if (vaultName) {
        setVaultNameFromAPI(vaultName);
      }
      setLastFetch(new Date());
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load tasks",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const res = await fetch(
        getApiUrl(port, API_ENDPOINTS.updateTask(taskId)),
        getFetchOptions("PUT", updates, AuthToken),
      );

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      await showToast({ style: Toast.Style.Success, title: "Task updated" });
      await fetchTasks();
    } catch (error) {
      console.error("Failed to update task:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update task",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    try {
      const res = await fetch(
        getApiUrl(port, API_ENDPOINTS.toggleStatus(task.id)),
        getFetchOptions("POST", undefined, AuthToken),
      );

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      await showToast({ style: Toast.Style.Success, title: "Task status updated" });
      await fetchTasks();
    } catch (error) {
      console.error("Failed to toggle task status:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle task status",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const deleteTask = async (task: Task) => {
    const options = {
      title: "Delete Task",
      message: `Are you sure you want to delete "${task.title}"?`,
      primaryAction: {
        title: "Delete",
      },
    };

    if (!(await confirmAlert(options))) return;

    try {
      const res = await fetch(
        getApiUrl(port, API_ENDPOINTS.deleteTask(task.id)),
        getFetchOptions("DELETE", undefined, AuthToken),
      );

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      await showToast({ style: Toast.Style.Success, title: "Task deleted" });
      await fetchTasks();
    } catch (error) {
      console.error("Failed to delete task:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete task",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Group tasks by due date
  const groupTasks = (tasks: Task[]) => {
    const openTasks = tasks.filter((task) => task.status !== "done");

    return {
      overdue: openTasks.filter((task) => task.due && isOverdue(task.due)),
      today: openTasks.filter((task) => task.due && isToday(task.due) && !isOverdue(task.due)),
      tomorrow: openTasks.filter((task) => task.due && isTomorrow(task.due)),
      thisWeek: openTasks.filter((task) => task.due && isThisWeek(task.due)),
      noDueDate: openTasks.filter((task) => !task.due),
    };
  };

  const getPriorityIcon = (priority: string) => {
    return getHelperPriorityIcon(priority as Task["priority"]);
  };

  const renderStatusActions = (task: Task) => {
    switch (task.status) {
      case "none":
      case "open":
        return (
          <>
            <MenuBarExtra.Item
              title="Mark as in Progress"
              icon={Icon.CircleProgress}
              onAction={() => updateTask(task.id, { status: "in-progress" })}
            />
            <MenuBarExtra.Item title="Mark as Done" icon={Icon.CheckCircle} onAction={() => toggleTaskStatus(task)} />
          </>
        );
      case "in-progress":
        return (
          <MenuBarExtra.Item title="Mark as Done" icon={Icon.CheckCircle} onAction={() => toggleTaskStatus(task)} />
        );
      case "done":
        return <MenuBarExtra.Item title="Mark as Open" icon={Icon.Circle} onAction={() => toggleTaskStatus(task)} />;
      default:
        return null;
    }
  };

  const openInObsidian = async (task: Task) => {
    if (!effectiveVaultName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Vault name not available",
        message: "Unable to determine Obsidian vault name",
      });
      return;
    }
    const url = `obsidian://open?vault=${encodeURIComponent(effectiveVaultName)}&file=${encodeURIComponent(task.path)}`;
    await open(url);
  };

  const renderDueDateActions = (task: Task) => (
    <MenuBarExtra.Submenu title="Change Due Date" icon={Icon.Calendar}>
      <MenuBarExtra.Item
        title="Today"
        icon={Icon.Clock}
        onAction={() => updateTask(task.id, { due: getTodayInLocalTime() })}
      />
      <MenuBarExtra.Item
        title="Tomorrow"
        icon={Icon.Clock}
        onAction={() => updateTask(task.id, { due: format(addDays(new Date(), 1), "yyyy-MM-dd") })}
      />
      <MenuBarExtra.Item
        title="This Week-End"
        icon={Icon.Clock}
        onAction={() => {
          const weekend = new Date();
          const daysUntilSaturday = 6 - weekend.getDay();
          weekend.setDate(weekend.getDate() + daysUntilSaturday);
          updateTask(task.id, { due: format(weekend, "yyyy-MM-dd") });
        }}
      />
      <MenuBarExtra.Item
        title="Next Week"
        icon={Icon.Clock}
        onAction={() => {
          const today = new Date();
          const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
          const nextMonday = addDays(today, daysUntilNextMonday);
          updateTask(task.id, { due: format(nextMonday, "yyyy-MM-dd") });
        }}
      />
      <MenuBarExtra.Item
        title="No Due Date"
        icon={Icon.XMarkCircle}
        onAction={() => updateTask(task.id, { due: undefined })}
      />
    </MenuBarExtra.Submenu>
  );

  const renderPriorityActions = (task: Task) => (
    <MenuBarExtra.Submenu title="Set Priority" icon={Icon.Important}>
      <MenuBarExtra.Item
        title="High"
        icon={getPriorityIcon("high")}
        onAction={() => updateTask(task.id, { priority: "high" })}
      />
      <MenuBarExtra.Item
        title="Normal"
        icon={getPriorityIcon("normal")}
        onAction={() => updateTask(task.id, { priority: "normal" })}
      />
      <MenuBarExtra.Item
        title="Low"
        icon={getPriorityIcon("low")}
        onAction={() => updateTask(task.id, { priority: "low" })}
      />
      <MenuBarExtra.Item
        title="None"
        icon={getPriorityIcon("none")}
        onAction={() => updateTask(task.id, { priority: "none" })}
      />
    </MenuBarExtra.Submenu>
  );

  const grouped = groupTasks(tasks);
  const urgentTasks = grouped.overdue.length + grouped.today.length;
  const effectiveVaultName = vaultNameFromAPI || "";
  const totalActiveTasks =
    grouped.overdue.length +
    grouped.today.length +
    grouped.tomorrow.length +
    grouped.thisWeek.length +
    grouped.noDueDate.length;

  return (
    <MenuBarExtra
      icon={{ source: "../assets/menubar-icon.png" }}
      title={urgentTasks > 0 ? urgentTasks.toString() : undefined}
      isLoading={isLoading}
      tooltip={`TaskNotes: ${urgentTasks > 0 ? `${urgentTasks} urgent, ` : ""}${totalActiveTasks} total tasks`}
    >
      {/* Overdue Tasks */}
      {grouped.overdue.length > 0 && (
        <MenuBarExtra.Section title="Overdue">
          {grouped.overdue.map((task) => (
            <MenuBarExtra.Submenu key={task.id} title={task.title} icon={getStatusIcon(task.status)}>
              <MenuBarExtra.Item
                title="Open in Obsidian"
                icon={{ source: "../assets/menubar-icon.png" }}
                onAction={() => openInObsidian(task)}
              />
              {renderStatusActions(task)}
              <MenuBarExtra.Separator />
              {renderDueDateActions(task)}
              {renderPriorityActions(task)}
              <MenuBarExtra.Separator />
              <MenuBarExtra.Item title="Delete Task..." icon={Icon.Trash} onAction={() => deleteTask(task)} />
            </MenuBarExtra.Submenu>
          ))}
        </MenuBarExtra.Section>
      )}

      {/* Today Tasks */}
      {grouped.today.length > 0 && (
        <MenuBarExtra.Section title="Today">
          {grouped.today.map((task) => (
            <MenuBarExtra.Submenu key={task.id} title={task.title} icon={getStatusIcon(task.status)}>
              <MenuBarExtra.Item
                title="Open in Obsidian"
                icon={{ source: "../assets/menubar-icon.png" }}
                onAction={() => openInObsidian(task)}
              />
              {renderStatusActions(task)}
              <MenuBarExtra.Separator />
              {renderDueDateActions(task)}
              {renderPriorityActions(task)}
              <MenuBarExtra.Separator />
              <MenuBarExtra.Item title="Delete Task..." icon={Icon.Trash} onAction={() => deleteTask(task)} />
            </MenuBarExtra.Submenu>
          ))}
        </MenuBarExtra.Section>
      )}

      {/* Tomorrow Tasks */}
      {grouped.tomorrow.length > 0 && (
        <MenuBarExtra.Section title="Tomorrow">
          {grouped.tomorrow.map((task) => (
            <MenuBarExtra.Submenu key={task.id} title={task.title} icon={getStatusIcon(task.status)}>
              <MenuBarExtra.Item
                title="Open in Obsidian"
                icon={{ source: "../assets/menubar-icon.png" }}
                onAction={() => openInObsidian(task)}
              />
              {renderStatusActions(task)}
              <MenuBarExtra.Separator />
              {renderDueDateActions(task)}
              {renderPriorityActions(task)}
              <MenuBarExtra.Separator />
              <MenuBarExtra.Item title="Delete Task..." icon={Icon.Trash} onAction={() => deleteTask(task)} />
            </MenuBarExtra.Submenu>
          ))}
        </MenuBarExtra.Section>
      )}

      {/* This Week Tasks */}
      {grouped.thisWeek.length > 0 && (
        <MenuBarExtra.Section title="This Week">
          {grouped.thisWeek.map((task) => (
            <MenuBarExtra.Submenu key={task.id} title={task.title} icon={getStatusIcon(task.status)}>
              <MenuBarExtra.Item
                title="Open in Obsidian"
                icon={{ source: "../assets/menubar-icon.png" }}
                onAction={() => openInObsidian(task)}
              />
              {renderStatusActions(task)}
              <MenuBarExtra.Separator />
              {renderDueDateActions(task)}
              {renderPriorityActions(task)}
              <MenuBarExtra.Separator />
              <MenuBarExtra.Item title="Delete Task..." icon={Icon.Trash} onAction={() => deleteTask(task)} />
            </MenuBarExtra.Submenu>
          ))}
        </MenuBarExtra.Section>
      )}

      {/* No Due Date Tasks (if any) */}
      {grouped.noDueDate.length > 0 && (
        <MenuBarExtra.Section title="No Due Date">
          {grouped.noDueDate.slice(0, 5).map((task) => (
            <MenuBarExtra.Submenu key={task.id} title={task.title} icon={getStatusIcon(task.status)}>
              <MenuBarExtra.Item
                title="Open in Obsidian"
                icon={{ source: "../assets/menubar-icon.png" }}
                onAction={() => openInObsidian(task)}
              />
              {renderStatusActions(task)}
              <MenuBarExtra.Separator />
              {renderDueDateActions(task)}
              {renderPriorityActions(task)}
              <MenuBarExtra.Separator />
              <MenuBarExtra.Item title="Delete Task..." icon={Icon.Trash} onAction={() => deleteTask(task)} />
            </MenuBarExtra.Submenu>
          ))}
          {grouped.noDueDate.length > 5 && (
            <MenuBarExtra.Item
              title={`Show ${grouped.noDueDate.length - 5} more...`}
              icon={Icon.Ellipsis}
              onAction={() => launchCommand({ name: "tasknotes-my-tasks", type: LaunchType.UserInitiated })}
            />
          )}
        </MenuBarExtra.Section>
      )}

      {/* Empty State */}
      {totalActiveTasks === 0 && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="No tasks" icon={Icon.CheckCircle} onAction={() => {}} />
        </MenuBarExtra.Section>
      )}

      {/* Action Section */}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Create Task"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() => launchCommand({ name: "tasknotes-create-task", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
        <MenuBarExtra.Separator />
        <MenuBarExtra.Item
          title="Open Tasks"
          icon={Icon.List}
          onAction={() => launchCommand({ name: "tasknotes-my-tasks", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>

      {lastFetch && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title={`Last updated: ${format(lastFetch, "HH:mm")}`}
            icon={Icon.Clock}
            onAction={fetchTasks}
          />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
