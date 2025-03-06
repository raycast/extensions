import { LocalStorage } from "@raycast/api";
import { Day, Project, Session, Task, TaskType, WorklogData } from "./types";
import { randomUUID } from "crypto";

const STORAGE_KEY = "wabix-worklog-data";

// Default projects to start with
const DEFAULT_PROJECTS: Project[] = [
  { id: "p1", name: "Frontend Development" },
  { id: "p2", name: "Backend Development" },
  { id: "p3", name: "UI/UX Design" },
  { id: "p4", name: "DevOps" },
  { id: "p5", name: "Client Support" },
];

// Load worklog data from storage
export async function getWorklogData(): Promise<WorklogData> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!data) return { projects: DEFAULT_PROJECTS, sessions: [] };

  return JSON.parse(data);
}

// Save worklog data to storage
export async function saveWorklogData(data: WorklogData): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Start a new session for a project
export async function startSession(projectId: string): Promise<Session> {
  const data = await getWorklogData();

  if (data.activeSession) {
    throw new Error("A session is already active");
  }

  const newSession: Session = {
    id: randomUUID(),
    projectId,
    startTime: Date.now(),
    tasks: [],
  };

  data.activeSession = newSession;
  data.sessions.push(newSession);
  await saveWorklogData(data);

  return newSession;
}

// End a task in the current session
export async function endTask(description: string, type: TaskType, githubUrl?: string): Promise<Task> {
  const data = await getWorklogData();

  if (!data.activeSession) {
    throw new Error("No active session");
  }

  const task: Task = {
    id: randomUUID(),
    description,
    type,
    githubUrl,
    startTime:
      data.activeSession.tasks.length > 0
        ? data.activeSession.tasks[data.activeSession.tasks.length - 1].endTime
        : data.activeSession.startTime,
    endTime: Date.now(),
  };

  data.activeSession.tasks.push(task);

  // Update the session in the sessions array
  const sessionIndex = data.sessions.findIndex((s) => s.id === data.activeSession?.id);
  if (sessionIndex !== -1) {
    data.sessions[sessionIndex] = data.activeSession;
  }

  await saveWorklogData(data);

  return task;
}

// End the current session
export async function endSession(): Promise<Session | null> {
  const data = await getWorklogData();

  if (!data.activeSession) {
    return null;
  }

  data.activeSession.endTime = Date.now();

  // Update the session in the sessions array
  const sessionIndex = data.sessions.findIndex((s) => s.id === data.activeSession?.id);
  if (sessionIndex !== -1) {
    data.sessions[sessionIndex] = data.activeSession;
  }

  const session = data.activeSession;
  data.activeSession = undefined;

  await saveWorklogData(data);

  return session;
}

// Clear all logs
export async function clearLogs(): Promise<void> {
  const data = await getWorklogData();

  data.sessions = [];
  data.activeSession = undefined;

  await saveWorklogData(data);
}

// Format duration from milliseconds to hh:mm:ss
export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

// Format duration as decimal hours
export function formatDecimalHours(durationMs: number): string {
  const hours = durationMs / 3600000;
  return hours.toFixed(2);
}

// Format timestamp as time string
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Format timestamp as date string
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().split("T")[0];
}

// Check if a task type requires GitHub URL
export function requiresGithubUrl(type: TaskType): boolean {
  return [TaskType.TASK, TaskType.BUG_FIX, TaskType.CHANGE_REQUEST].includes(type);
}

// Get worklog data grouped by day and project
export async function getGroupedWorklog(): Promise<Day[]> {
  const data = await getWorklogData();

  const dayMap: Record<string, Day> = {};

  for (const session of data.sessions) {
    const project = data.projects.find((p) => p.id === session.projectId);
    if (!project) continue;

    for (const task of session.tasks) {
      const date = formatDate(task.startTime);

      if (!dayMap[date]) {
        dayMap[date] = {
          date,
          projects: {},
        };
      }

      if (!dayMap[date].projects[project.id]) {
        dayMap[date].projects[project.id] = {
          projectName: project.name,
          tasks: [],
          totalDuration: 0,
          formattedTotalDuration: "00:00:00",
          totalDecimalHours: "0.00",
        };
      }

      const duration = task.endTime - task.startTime;
      dayMap[date].projects[project.id].totalDuration += duration;

      dayMap[date].projects[project.id].tasks.push({
        ...task,
        formattedDuration: formatDuration(duration),
        decimalHours: formatDecimalHours(duration),
        timeRange: `${formatTime(task.startTime)} → ${formatTime(task.endTime)}`,
      });
    }

    // Update total durations
    for (const day of Object.values(dayMap)) {
      for (const project of Object.values(day.projects)) {
        project.formattedTotalDuration = formatDuration(project.totalDuration);
        project.totalDecimalHours = formatDecimalHours(project.totalDuration);
      }
    }
  }

  // Convert to array and sort by date (descending)
  return Object.values(dayMap).sort((a, b) => b.date.localeCompare(a.date));
}

// Get the currently active session and related project
export async function getActiveSession(): Promise<{ session: Session; project: Project } | null> {
  const data = await getWorklogData();

  if (!data.activeSession) {
    return null;
  }

  const project = data.projects.find((p) => p.id === data.activeSession?.projectId);
  if (!project) {
    return null;
  }

  return {
    session: data.activeSession,
    project,
  };
}
