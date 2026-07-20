import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import CreateProject from "./create-project";
import CreateTask from "./create-task";
import EditTimer from "./edit-timer";
import { isAuthenticated, makeAuthenticatedRequest } from "./lib/auth";
import ListTasks from "./list-tasks";
import Projects from "./projects";
import StartTimer from "./start-timer";
import Timers from "./timers";
import { Project, Task, Timer } from "./types";

interface DashboardData {
  tasks: Task[];
  projects: Project[];
  timers: Timer[];
}

export default function Dashboard() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [data, setData] = useState<DashboardData>({
    tasks: [],
    projects: [],
    timers: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const [tasksRes, projectsRes, timersRes] = await Promise.all([
        makeAuthenticatedRequest("/tasks"),
        makeAuthenticatedRequest("/projects"),
        makeAuthenticatedRequest("/timers"),
      ]);

      const [tasksData, projectsData, timersData] = await Promise.all([
        tasksRes.ok ? tasksRes.json() : [],
        projectsRes.ok ? projectsRes.json() : [],
        timersRes.ok ? timersRes.json() : [],
      ]);

      setData({
        tasks: (tasksData as Task[]) || [],
        projects: (projectsData as Project[]) || [],
        timers: (timersData as Timer[]) || [],
      });
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to load dashboard data",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const authenticated = await isAuthenticated();
    setIsAuth(authenticated);

    if (authenticated) {
      await loadDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [loadDashboardData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const stats = useMemo(() => {
    const activeTasks = data.tasks.filter((t) => !t.completed);
    const completedToday = data.tasks.filter((t) => {
      if (!t.completed || !t.updated_at) return false;
      const updated = new Date(t.updated_at);
      const today = new Date();
      return updated.toDateString() === today.toDateString();
    });

    const overdueTasks = data.tasks.filter((t) => !t.completed && t.due_date && new Date(t.due_date) < new Date());

    const todayTasks = data.tasks.filter((t) => {
      if (t.completed || !t.due_date) return false;
      const due = new Date(t.due_date);
      const today = new Date();
      return due.toDateString() === today.toDateString();
    });

    const activeTimer = data.timers.find((t) => t.is_active);

    const todayTimers = data.timers.filter((t) => {
      if (!t.start_time) return false;
      const start = new Date(t.start_time);
      const today = new Date();
      return start.toDateString() === today.toDateString();
    });

    const todayHours = todayTimers.reduce((total, timer) => {
      if (!timer.start_time) return total;
      const start = new Date(timer.start_time);
      const end = timer.end_time ? new Date(timer.end_time) : new Date();
      return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);

    return {
      totalTasks: data.tasks.length,
      activeTasks: activeTasks.length,
      completedToday: completedToday.length,
      overdueTasks: overdueTasks.length,
      todayTasks: todayTasks.length,
      totalProjects: data.projects.length,
      activeTimer,
      todayHours: todayHours.toFixed(1),
      urgentTasks: activeTasks.filter((t) => t.priority?.toLowerCase() === "urgent").length,
    };
  }, [data]);

  const upcomingTasks = useMemo(() => {
    return data.tasks
      .filter((t) => !t.completed && t.due_date)
      .sort((a, b) => {
        const dateA = new Date(a.due_date!).getTime();
        const dateB = new Date(b.due_date!).getTime();
        return dateA - dateB;
      })
      .slice(0, 5);
  }, [data.tasks]);

  const recentTimers = useMemo(() => {
    return [...data.timers]
      .sort((a, b) => {
        const dateA = new Date(a.start_time || 0).getTime();
        const dateB = new Date(b.start_time || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 3);
  }, [data.timers]);

  function formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  function getProjectById(id?: string | null) {
    if (!id) return null;
    return data.projects.find((p) => p.id === id);
  }

  if (isAuth === false) {
    return (
      <Detail
        markdown={"Please set your Braintick email and password in Raycast Preferences."}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading}>
      {/* Overview Section */}
      <List.Section title="Overview" subtitle="Your productivity at a glance">
        <List.Item
          icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
          title="Today's Progress"
          subtitle={`${stats.completedToday} tasks completed • ${stats.todayHours}h tracked`}
          accessories={
            [
              stats.activeTimer && {
                tag: { value: "Timer Running", color: Color.Green },
                icon: Icon.Clock,
              },
            ].filter(Boolean) as List.Item.Accessory[]
          }
          actions={
            <ActionPanel>
              <Action.Push title="View All Tasks" icon={Icon.List} target={<ListTasks />} />
              <Action.Push title="View Timers" icon={Icon.Clock} target={<Timers />} />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="Tasks"
          subtitle={`${stats.activeTasks} active • ${stats.totalTasks} total`}
          accessories={
            [
              stats.overdueTasks > 0 && {
                tag: {
                  value: `${stats.overdueTasks} overdue`,
                  color: Color.Red,
                },
              },
              stats.todayTasks > 0 && {
                tag: {
                  value: `${stats.todayTasks} due today`,
                  color: Color.Orange,
                },
              },
              stats.urgentTasks > 0 && {
                tag: { value: `${stats.urgentTasks} urgent`, color: Color.Red },
                icon: Icon.ExclamationMark,
              },
            ].filter(Boolean) as List.Item.Accessory[]
          }
          actions={
            <ActionPanel>
              <Action.Push title="View All Tasks" icon={Icon.List} target={<ListTasks />} />
              <Action.Push
                title="Create Task"
                icon={Icon.Plus}
                target={<CreateTask onTaskCreated={loadDashboardData} />}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{ source: Icon.Folder, tintColor: Color.Purple }}
          title="Projects"
          subtitle={`${stats.totalProjects} projects`}
          accessories={[
            {
              text: `${stats.totalProjects}`,
              icon: Icon.Folder,
            },
          ]}
          actions={
            <ActionPanel>
              <Action.Push title="View All Projects" icon={Icon.List} target={<Projects />} />
              <Action.Push
                title="Create Project"
                icon={Icon.Plus}
                target={<CreateProject onProjectCreated={loadDashboardData} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Quick Actions */}
      <List.Section title="Quick Actions">
        <List.Item
          icon={{ source: Icon.Plus, tintColor: Color.Green }}
          title="Create New Task"
          subtitle="Add a task to your list"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Task"
                icon={Icon.Plus}
                target={<CreateTask onTaskCreated={loadDashboardData} />}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{ source: Icon.Play, tintColor: Color.Blue }}
          title={stats.activeTimer ? "Timer Running" : "Start Timer"}
          subtitle={
            stats.activeTimer ? `Tracking: ${stats.activeTimer.description || "Untitled"}` : "Begin tracking your time"
          }
          accessories={
            [
              stats.activeTimer && {
                tag: { value: "Active", color: Color.Green },
              },
            ].filter(Boolean) as List.Item.Accessory[]
          }
          actions={
            <ActionPanel>
              {stats.activeTimer ? (
                <Action.Push title="View Timers" icon={Icon.Clock} target={<Timers />} />
              ) : (
                <Action.Push
                  title="Start Timer"
                  icon={Icon.Play}
                  target={<StartTimer onTimerStarted={loadDashboardData} />}
                />
              )}
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <List.Section title="Upcoming Tasks" subtitle="Next tasks with due dates">
          {upcomingTasks.map((task) => {
            const project = getProjectById(task.project_id);
            const dueDate = task.due_date ? new Date(task.due_date) : null;
            const isOverdue = dueDate && dueDate < new Date();
            const isToday = dueDate && dueDate.toDateString() === new Date().toDateString();

            return (
              <List.Item
                key={task.id}
                icon={Icon.Circle}
                title={task.title}
                subtitle={project?.name}
                accessories={
                  [
                    dueDate && {
                      tag: {
                        value: isToday ? "Today" : dueDate.toLocaleDateString(),
                        color: isOverdue ? Color.Red : isToday ? Color.Orange : Color.Blue,
                      },
                      icon: Icon.Calendar,
                    },
                    task.priority && {
                      tag: { value: task.priority, color: Color.Yellow },
                    },
                  ].filter(Boolean) as List.Item.Accessory[]
                }
                actions={
                  <ActionPanel>
                    <Action.Push title="View All Tasks" icon={Icon.List} target={<ListTasks />} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {/* Recent Timers */}
      {recentTimers.length > 0 && (
        <List.Section title="Recent Time Entries">
          {recentTimers.map((timer) => {
            const project = getProjectById(timer.project_id);
            const duration = timer.start_time
              ? (timer.end_time ? new Date(timer.end_time) : new Date()).getTime() -
                new Date(timer.start_time).getTime()
              : 0;

            return (
              <List.Item
                key={timer.id}
                icon={timer.is_active ? Icon.Clock : Icon.CheckCircle}
                title={timer.description || project?.name || "Timer"}
                subtitle={project?.name}
                accessories={
                  [
                    {
                      text: formatDuration(duration),
                      icon: Icon.Hourglass,
                    },
                    timer.is_active && {
                      tag: { value: "Running", color: Color.Green },
                    },
                    timer.is_billable && {
                      icon: Icon.Coins,
                      tooltip: "Billable",
                    },
                  ].filter(Boolean) as List.Item.Accessory[]
                }
                actions={
                  <ActionPanel>
                    <Action.Push title="View All Timers" icon={Icon.Clock} target={<Timers />} />
                    <Action.Push
                      title="Edit Timer"
                      icon={Icon.Pencil}
                      target={<EditTimer timer={timer} onTimerUpdated={loadDashboardData} />}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
