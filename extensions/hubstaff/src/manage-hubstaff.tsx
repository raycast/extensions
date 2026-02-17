import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  LocalStorage,
} from "@raycast/api";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  hubstaff,
  getStatusAsync,
  fetchProjects,
  getTasks,
  formatCacheAge,
  getCacheTimestamp,
  ensureHubstaffInstalled,
  PROJECTS_CACHE_KEY,
  PROJECTS_CACHE_TIME_KEY,
  STATUS_CACHE_KEY,
} from "./shared";
import type { Project, Task, Status } from "./shared";

export default function Command() {
  try {
    ensureHubstaffInstalled();
  } catch {
    return (
      <List>
        <List.EmptyView
          title="Hubstaff Not Installed"
          description="Install Hubstaff from https://hubstaff.com/ and log in to use this extension."
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  return <ProjectList />;
}

function ProjectList() {
  const [status, setStatus] = useState<Status>({ tracking: false });
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cacheAge, setCacheAge] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackedBaseRef = useRef<string>("0:00:00");

  // Live elapsed timer — updates every second when tracking
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (status.tracking && status.active_project) {
      trackedBaseRef.current = status.active_project.tracked_today;
      setElapsed(status.active_project.tracked_today);

      const baseSeconds = parseHMS(status.active_project.tracked_today);
      const startedAt = Date.now();

      timerRef.current = setInterval(() => {
        const delta = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(formatHMS(baseSeconds + delta));
      }, 1000);
    } else {
      setElapsed(null);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [
    status.tracking,
    status.active_project?.id,
    status.active_project?.tracked_today,
  ]);

  // Update cache age display
  const updateCacheAge = useCallback(async () => {
    const ts = await getCacheTimestamp();
    setCacheAge(ts ? formatCacheAge(ts) : null);
  }, []);

  const refreshStatus = useCallback(async () => {
    const s = await getStatusAsync();
    setStatus(s);
    await LocalStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(s));
  }, []);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    const cachedStatus = await LocalStorage.getItem<string>(STATUS_CACHE_KEY);
    if (cachedStatus) {
      try {
        setStatus(JSON.parse(cachedStatus));
      } catch {
        /* ignore */
      }
    }
    const cached = await LocalStorage.getItem<string>(PROJECTS_CACHE_KEY);
    if (cached) {
      try {
        setProjects(JSON.parse(cached));
      } catch {
        /* ignore */
      }
    }
    if (!cached) {
      const fresh = fetchProjects();
      setProjects(fresh);
      await LocalStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(fresh));
      await LocalStorage.setItem(PROJECTS_CACHE_TIME_KEY, String(Date.now()));
    }
    await updateCacheAge();
    setIsLoading(false);
    refreshStatus();
  }, [refreshStatus, updateCacheAge]);

  const refreshProjects = useCallback(async () => {
    await showToast(Toast.Style.Animated, "Refreshing projects...");
    const fresh = fetchProjects();
    setProjects(fresh);
    await LocalStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(fresh));
    await LocalStorage.setItem(PROJECTS_CACHE_TIME_KEY, String(Date.now()));
    await updateCacheAge();
    refreshStatus();
    await showToast(Toast.Style.Success, `Loaded ${fresh.length} projects`);
  }, [refreshStatus, updateCacheAge]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  async function startProject(project: Project) {
    await showToast(Toast.Style.Animated, "Starting timer...");
    const result = hubstaff(["start_project", String(project.id)]);
    try {
      const res = JSON.parse(result);
      if (res.error) {
        await showToast(Toast.Style.Failure, res.error);
        return;
      }
    } catch {
      // no error field — treat as success
    }
    await showToast(Toast.Style.Success, `Started: ${project.name}`);
    const newStatus: Status = {
      tracking: true,
      active_project: {
        id: project.id,
        name: project.name,
        tracked_today: status.active_project?.tracked_today ?? "0:00:00",
      },
    };
    setStatus(newStatus);
    await LocalStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(newStatus));
    refreshStatus();
  }

  async function startTask(task: Task) {
    await showToast(Toast.Style.Animated, "Starting timer...");
    const result = hubstaff(["start_task", String(task.id)]);
    try {
      const res = JSON.parse(result);
      if (res.error) {
        await showToast(Toast.Style.Failure, res.error);
        return;
      }
    } catch {
      // no error field — treat as success
    }
    await showToast(Toast.Style.Success, `Started: ${task.summary}`);
    refreshStatus();
  }

  async function stopTimer() {
    await showToast(Toast.Style.Animated, "Stopping timer...");
    hubstaff(["stop"]);
    await showToast(Toast.Style.Success, "Timer stopped");
    const newStatus: Status = {
      tracking: false,
      active_project: status.active_project,
    };
    setStatus(newStatus);
    await LocalStorage.setItem(STATUS_CACHE_KEY, JSON.stringify(newStatus));
    refreshStatus();
  }

  const isActive = (project: Project) =>
    status.tracking && status.active_project?.id === project.id;

  const navTitle = elapsed
    ? `Today: ${elapsed}`
    : status.active_project?.tracked_today
      ? `Today: ${status.active_project.tracked_today}`
      : undefined;
  const projectsSubtitle = cacheAge ? `cached ${cacheAge}` : undefined;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects..."
      navigationTitle={navTitle}
    >
      {status.tracking && status.active_project && (
        <List.Section title="Running">
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.Green }}
            title={status.active_project.name}
            accessories={[
              {
                tag: {
                  value: elapsed ?? status.active_project.tracked_today,
                  color: Color.Green,
                },
              },
              { tag: { value: "Tracking", color: Color.Green } },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Stop Timer"
                  icon={Icon.Stop}
                  onAction={stopTimer}
                />
                <Action
                  title="Refresh Projects"
                  icon={Icon.ArrowClockwise}
                  onAction={refreshProjects}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Projects" subtitle={projectsSubtitle}>
        {[...projects]
          .filter((project) => !isActive(project))
          .map((project) => (
            <List.Item
              key={project.id}
              icon={Icon.Circle}
              title={project.name}
              actions={
                <ActionPanel>
                  <Action
                    title="Start Timer"
                    icon={Icon.Play}
                    onAction={() => startProject(project)}
                  />
                  {project.requires_task && (
                    <Action.Push
                      title="Pick Task"
                      icon={Icon.List}
                      target={
                        <TaskList project={project} onStart={startTask} />
                      }
                    />
                  )}
                  <Action
                    title="Refresh Projects"
                    icon={Icon.ArrowClockwise}
                    onAction={refreshProjects}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

function TaskList({
  project,
  onStart,
}: {
  project: Project;
  onStart: (task: Task) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = getTasks(project.id);
    setTasks(t);
    setIsLoading(false);
  }, [project.id]);

  return (
    <List isLoading={isLoading} navigationTitle={project.name}>
      {tasks.map((task) => (
        <List.Item
          key={task.id}
          icon={Icon.Dot}
          title={task.summary}
          actions={
            <ActionPanel>
              <Action
                title="Start Timer"
                icon={Icon.Play}
                onAction={() => onStart(task)}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && tasks.length === 0 && (
        <List.EmptyView
          title="No tasks"
          description="This project has no tasks"
        />
      )}
    </List>
  );
}

function parseHMS(hms: string): number {
  const parts = hms.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatHMS(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
