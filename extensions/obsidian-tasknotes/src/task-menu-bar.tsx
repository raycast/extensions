import {
  MenuBarExtra,
  Icon,
  Color,
  open,
  getPreferenceValues,
  LaunchType,
  launchCommand,
  openCommandPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClient } from "./api/client";
import { Task } from "./api/types";
import { formatDate, isOverdue, isToday, formatProjects, getTaskId } from "./utils/formatters";

interface Preferences {
  apiUrl: string;
  apiPort: string;
  apiToken?: string;
  obsidianVault: string;
}

interface TasksBySection {
  today: Task[];
  overdue: Task[];
}

interface TaskData {
  tasks: TasksBySection;
  counts: {
    today: number;
    overdue: number;
  };
  error: string | null;
}

function getObsidianURI(task: Task, vaultName: string): string {
  // Use Obsidian Advanced URI plugin format
  // Remove .md extension if present
  const filePath = task.path.replace(/\.md$/, "");

  // Encode the vault name and file path
  const encodedVault = encodeURIComponent(vaultName);
  const encodedPath = encodeURIComponent(filePath);

  // Use advanced-uri format which works better for opening specific files
  return `obsidian://advanced-uri?vault=${encodedVault}&filepath=${encodedPath}`;
}

function getTaskIcon(task: Task): { source: Icon; tintColor: Color } {
  // Check status first
  if (task.status === "done" || task.status === "completed") {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (task.status === "in-progress") {
    return { source: Icon.Circle, tintColor: Color.Blue };
  }
  if (task.status === "holding") {
    return { source: Icon.Pause, tintColor: Color.Orange };
  }
  if (task.status === "open") {
    // Show red for overdue open tasks, otherwise gray
    if (isOverdue(task.due)) {
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    }
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
  // For "none" or any other status
  if (isOverdue(task.due)) {
    return { source: Icon.ExclamationMark, tintColor: Color.Red };
  }
  return { source: Icon.Circle, tintColor: Color.SecondaryText };
}

export default function TaskMenuBar() {
  const preferences = getPreferenceValues<Preferences>();
  const vaultName = preferences.obsidianVault || "";

  const { data, isLoading } = useCachedPromise(
    async () => {
      const client = getClient();

      try {
        // Check API health first
        await client.checkHealth();
      } catch {
        return {
          tasks: { today: [], overdue: [] },
          counts: { today: 0, overdue: 0 },
          error: "API not available",
        } as TaskData;
      }

      const response = await client.listTasks();

      if (!response.success || !response.data) {
        return {
          tasks: { today: [], overdue: [] },
          counts: { today: 0, overdue: 0 },
          error: "Failed to load tasks",
        } as TaskData;
      }

      const tasks = response.data.tasks;

      // Filter out completed and archived tasks
      const activeTasks = tasks.filter(
        (task) => task.status !== "done" && task.status !== "completed" && !task.archived,
      );

      // Separate into today and overdue
      const todayTasks = activeTasks.filter((task) => isToday(task.due));
      const overdueTasks = activeTasks.filter((task) => isOverdue(task.due));

      // Sort each group by priority and due date
      const sortTasks = (tasks: Task[]) => {
        return tasks.sort((a, b) => {
          // First by due date
          if (!a.due && !b.due) return 0;
          if (!a.due) return 1;
          if (!b.due) return -1;
          return new Date(a.due).getTime() - new Date(b.due).getTime();
        });
      };

      return {
        tasks: { today: sortTasks(todayTasks), overdue: sortTasks(overdueTasks) },
        counts: { today: todayTasks.length, overdue: overdueTasks.length },
        error: null,
      };
    },
    [],
    {
      initialData: { tasks: { today: [], overdue: [] }, counts: { today: 0, overdue: 0 }, error: null },
    },
  );

  const totalCount = (data?.counts.today || 0) + (data?.counts.overdue || 0);
  const todayTasks = data?.tasks.today || [];
  const overdueTasks = data?.tasks.overdue || [];

  // Show error icon if there's an error
  if (data?.error) {
    return (
      <MenuBarExtra
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        tooltip="TaskNotes: Error"
        isLoading={isLoading}
      >
        <MenuBarExtra.Item title={data.error} />
        <MenuBarExtra.Separator />
        <MenuBarExtra.Item title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra>
    );
  }

  // Determine icon and title based on task count
  const todayCount = data?.counts.today || 0;
  const overdueCount = data?.counts.overdue || 0;

  let menuBarDisplay;
  let tooltip;

  if (totalCount === 0) {
    // All caught up - show green check
    menuBarDisplay = {
      icon: { source: Icon.CheckCircle, tintColor: Color.Green },
    };
    tooltip = "TaskNotes: No tasks due";
  } else {
    // Show count breakdown in brackets
    const displayText =
      overdueCount > 0 && todayCount > 0
        ? `[${overdueCount} | ${todayCount}]` // Show both overdue | today
        : overdueCount > 0
          ? `[${overdueCount}]` // Only overdue
          : `[${todayCount}]`; // Only today

    menuBarDisplay = {
      title: displayText,
      icon:
        overdueCount > 0
          ? { source: Icon.Circle, tintColor: Color.Red }
          : { source: Icon.Circle, tintColor: Color.Blue },
    };

    const parts = [];
    if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
    if (todayCount > 0) parts.push(`${todayCount} today`);
    tooltip = `TaskNotes: ${parts.join(", ")}`;
  }

  return (
    <MenuBarExtra {...menuBarDisplay} tooltip={tooltip} isLoading={isLoading}>
      {/* Header with count */}
      <MenuBarExtra.Item title={`${totalCount} Task${totalCount === 1 ? "" : "s"} Due`} icon={Icon.Calendar} />
      <MenuBarExtra.Separator />

      {/* Overdue Section */}
      {overdueTasks.length > 0 && (
        <>
          <MenuBarExtra.Section title={`Overdue (${overdueTasks.length})`}>
            {overdueTasks.map((task: Task) => {
              const taskIcon = getTaskIcon(task);
              const subtitle = formatProjects(task.projects) || formatDate(task.due);

              return (
                <MenuBarExtra.Item
                  key={getTaskId(task)}
                  icon={taskIcon}
                  title={task.title}
                  subtitle={subtitle}
                  tooltip={`${task.title} - ${formatDate(task.due)}`}
                  onAction={() => {
                    if (vaultName) {
                      open(getObsidianURI(task, vaultName));
                    } else {
                      // If no vault name is set, open the View Tasks command
                      launchCommand({
                        name: "view-tasks",
                        type: LaunchType.UserInitiated,
                      });
                    }
                  }}
                />
              );
            })}
          </MenuBarExtra.Section>
          <MenuBarExtra.Separator />
        </>
      )}

      {/* Today Section */}
      {todayTasks.length > 0 && (
        <>
          <MenuBarExtra.Section title={`Today (${todayTasks.length})`}>
            {todayTasks.map((task: Task) => {
              const taskIcon = getTaskIcon(task);
              const subtitle = formatProjects(task.projects) || formatDate(task.due);

              return (
                <MenuBarExtra.Item
                  key={getTaskId(task)}
                  icon={taskIcon}
                  title={task.title}
                  subtitle={subtitle}
                  tooltip={`${task.title} - ${formatDate(task.due)}`}
                  onAction={() => {
                    if (vaultName) {
                      open(getObsidianURI(task, vaultName));
                    } else {
                      // If no vault name is set, open the View Tasks command
                      launchCommand({
                        name: "view-tasks",
                        type: LaunchType.UserInitiated,
                      });
                    }
                  }}
                />
              );
            })}
          </MenuBarExtra.Section>
          <MenuBarExtra.Separator />
        </>
      )}

      {/* Empty state */}
      {totalCount === 0 && (
        <>
          <MenuBarExtra.Item title="All caught up! 🎉" icon={{ source: Icon.CheckCircle, tintColor: Color.Green }} />
          <MenuBarExtra.Separator />
        </>
      )}

      {/* Actions */}
      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          title="View All Tasks"
          icon={Icon.List}
          onAction={() => {
            if (vaultName) {
              // Open the TaskNotes command in Obsidian using Advanced URI
              const encodedVault = encodeURIComponent(vaultName);
              const commandName = encodeURIComponent("TaskNotes: Open tasks view");
              open(`obsidian://advanced-uri?vault=${encodedVault}&commandname=${commandName}`);
            } else {
              // Fallback to Raycast command if no vault is configured
              launchCommand({
                name: "view-tasks",
                type: LaunchType.UserInitiated,
              });
            }
          }}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
        />
        <MenuBarExtra.Item
          title="Create Task"
          icon={Icon.Plus}
          onAction={() => {
            launchCommand({
              name: "create-task",
              type: LaunchType.UserInitiated,
            });
          }}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
        {!vaultName && (
          <MenuBarExtra.Item title="⚠️ Set Obsidian Vault Name" icon={Icon.Gear} onAction={openCommandPreferences} />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
