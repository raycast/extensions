import { Color, Icon, LaunchProps, List, getPreferenceValues } from "@raycast/api";
import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Task,
  Project,
  getApiToken,
  getTasksForToday,
  getInboxTasks,
  getUpcomingTasks,
  getCompletedTasks,
  getProjectTasks,
  getProjects,
  getProjectIcon,
  withErrorHandling,
  ApiError,
} from "./api";
import { TaskListItem, NoTokenView, ErrorView } from "./components/TaskList";

export type ViewType = "inbox" | "today" | "upcoming" | "completed" | `project_${string}`;

interface TaskSection {
  title: string;
  tasks: Task[];
}

function formatDateForSection(date: Date | undefined, unscheduledLabel = "Date Not Set"): string {
  if (!date || date.getTime() === 0) return unscheduledLabel;
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isTomorrow) return "Tomorrow";
  if (isYesterday) return "Yesterday";

  const options: Intl.DateTimeFormatOptions = { weekday: "long", month: "short", day: "numeric" };
  if (date.getFullYear() !== today.getFullYear()) {
    options.year = "numeric";
  }

  return date.toLocaleDateString(undefined, options);
}

function groupTasksByDate(
  tasks: Task[],
  dateField: "start" | "journalDate",
  sortOrder: "asc" | "desc",
  unscheduledLabel = "Date Not Set",
): TaskSection[] {
  const groups: Record<number, Task[]> = {};

  tasks.forEach((task) => {
    const dateValue = task[dateField];
    const date = dateValue ? new Date(dateValue) : undefined;
    const noDate = new Date(0);
    const dateTs = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() : noDate.getTime();

    if (!groups[dateTs]) {
      groups[dateTs] = [];
    }
    groups[dateTs].push(task);
  });

  // Sort sections by date (most recent first for completed, earliest first for upcoming)
  // Put unscheduled (epoch) at the end for asc order, at the beginning for desc order
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const aNum = parseInt(a);
    const bNum = parseInt(b);

    // Handle epoch (0) specially - always put at the end
    if (aNum === 0) return 1;
    if (bNum === 0) return -1;

    if (sortOrder === "asc") {
      return aNum - bNum;
    } else {
      return bNum - aNum;
    }
  });

  return sortedKeys.map((key) => ({
    title: formatDateForSection(new Date(parseInt(key)), unscheduledLabel),
    tasks: groups[parseInt(key)],
  }));
}

export default function Home({ launchContext }: LaunchProps<{ launchContext?: { view: ViewType } }>) {
  const { view: preferencesView } = getPreferenceValues();
  const [view, setView] = useState<ViewType>(launchContext?.view ?? preferencesView ?? "today");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<string, Project>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getApiToken();
      if (!token) {
        setHasToken(false);
        setIsLoading(false);
        return;
      }

      // Load projects first
      const projectsResult = await withErrorHandling(() => getProjects(), "Failed to load projects", {
        showDetails: true,
      });

      if (projectsResult) {
        setProjects(projectsResult);
        const projectMap: Record<string, Project> = {};
        projectsResult.forEach((project) => {
          projectMap[project.id] = project;
        });
        setProjectsMap(projectMap);
      }

      // Load tasks based on current view
      let tasksResult: Task[] | null = null;

      if (view === "inbox") {
        tasksResult = await withErrorHandling(() => getInboxTasks(), "Failed to load inbox tasks", {
          showDetails: true,
        });
      } else if (view === "today") {
        tasksResult = await withErrorHandling(() => getTasksForToday(), "Failed to load today's tasks", {
          showDetails: true,
        });
      } else if (view === "upcoming") {
        tasksResult = await withErrorHandling(() => getUpcomingTasks(), "Failed to load upcoming tasks", {
          showDetails: true,
        });
      } else if (view === "completed") {
        tasksResult = await withErrorHandling(() => getCompletedTasks(), "Failed to load completed tasks", {
          showDetails: true,
        });
      } else if (view.startsWith("project_")) {
        const projectId = view.replace("project_", "");
        tasksResult = await withErrorHandling(() => getProjectTasks(projectId), "Failed to load project tasks", {
          showDetails: true,
        });
      }

      if (tasksResult) {
        setTasks(tasksResult);
      } else {
        setError("Failed to load tasks. Please try again.");
      }
    } catch (err) {
      const errorMessage =
        err instanceof ApiError
          ? err.userFriendlyMessage
          : err instanceof Error
            ? err.message
            : "An unexpected error occurred";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [view]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navigationTitle = useMemo(() => {
    if (view === "inbox") return "Inbox";
    if (view === "today") return "Today";
    if (view === "upcoming") return "Upcoming";
    if (view === "completed") return "Completed";
    if (view.startsWith("project_")) {
      const projectId = view.replace("project_", "");
      return projectsMap[projectId]?.title ?? "Project";
    }
    return "Tasks";
  }, [view, projectsMap]);

  const emptyViewConfig = useMemo(() => {
    if (view === "inbox") {
      return {
        icon: Icon.Tray,
        title: "Inbox is empty",
        description: "No tasks without project or scheduled date",
      };
    }
    if (view === "today") {
      return {
        icon: Icon.CheckCircle,
        title: "No tasks for today",
        description: "You're all caught up! 🎉",
      };
    }
    if (view === "upcoming") {
      return {
        icon: Icon.Calendar,
        title: "No upcoming tasks",
        description: "Nothing scheduled for the future",
      };
    }
    if (view === "completed") {
      return {
        icon: Icon.CheckCircle,
        title: "No completed tasks",
        description: "Complete some tasks to see them here",
      };
    }
    return {
      icon: Icon.List,
      title: "No tasks",
      description: "This project has no tasks",
    };
  }, [view]);

  if (!hasToken) {
    return <NoTokenView />;
  }

  if (error && tasks.length === 0) {
    return <ErrorView error={error} onRetry={loadData} />;
  }

  // Group tasks by date for completed, upcoming, and project views
  const sections = useMemo(() => {
    if (view === "completed") {
      return groupTasksByDate(tasks, "journalDate", "desc");
    }
    if (view === "upcoming") {
      return groupTasksByDate(tasks, "start", "asc");
    }
    if (view.startsWith("project_")) {
      return groupTasksByDate(tasks, "start", "asc", "Unscheduled");
    }
    return [{ title: navigationTitle, tasks }];
  }, [tasks, view, navigationTitle]);

  return (
    <List
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search tasks..."
      searchBarAccessory={
        <List.Dropdown tooltip="Select View" onChange={(newView) => setView(newView as ViewType)} value={view}>
          <List.Dropdown.Section>
            <List.Dropdown.Item title="Inbox" value="inbox" icon={{ source: Icon.Tray, tintColor: Color.Blue }} />
            <List.Dropdown.Item title="Today" value="today" icon={{ source: Icon.Calendar, tintColor: Color.Green }} />
            <List.Dropdown.Item
              title="Upcoming"
              value="upcoming"
              icon={{ source: Icon.Calendar, tintColor: Color.Purple }}
            />
            <List.Dropdown.Item
              title="Completed"
              value="completed"
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            />
          </List.Dropdown.Section>

          {projects.length > 0 && (
            <List.Dropdown.Section title="Projects">
              {projects.map((project) => (
                <List.Dropdown.Item
                  key={project.id}
                  title={project.title}
                  value={`project_${project.id}`}
                  icon={getProjectIcon(project)}
                />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
      isLoading={isLoading}
    >
      {tasks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={emptyViewConfig.icon}
          title={emptyViewConfig.title}
          description={emptyViewConfig.description}
        />
      ) : (
        sections.map((section) => (
          <List.Section key={section.title} title={section.title} subtitle={`${section.tasks.length} tasks`}>
            {section.tasks.map((task) => (
              <TaskListItem
                key={task.id}
                task={task}
                project={task.projectId ? projectsMap[task.projectId] : undefined}
                projects={projects}
                onTaskUpdated={loadData}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
