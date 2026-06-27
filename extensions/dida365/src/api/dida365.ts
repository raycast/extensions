import { getPreferenceValues } from "@raycast/api";
import { MissingApiTokenError, openDidaSettingsOnce } from "../setup.js";
import type { CreateTaskInput, Project, ProjectData, Task } from "../types.js";

const API_BASE_URL = "https://api.dida365.com/open/v1";

class Dida365Error extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "Dida365Error";
  }
}

function preferences() {
  const values = getPreferenceValues<Preferences>();
  return {
    apiToken: values.apiToken?.trim(),
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiToken } = preferences();

  if (!apiToken) {
    await openDidaSettingsOnce();
    throw new MissingApiTokenError();
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Dida365Error(`Dida365 API request failed: ${response.status}`, response.status, body);
  }

  const body = await response.text();

  if (!body) {
    return undefined as T;
  }

  return JSON.parse(body) as T;
}

export async function listProjects(): Promise<Project[]> {
  const projects = await request<Project[]>("/project");
  return projects.filter((project) => !project.closed);
}

export async function getProjectData(projectId: string): Promise<ProjectData> {
  return request<ProjectData>(`/project/${encodeURIComponent(projectId)}/data`);
}

export async function listOpenTasks(): Promise<Task[]> {
  const projects = await listProjects();
  const projectData = await Promise.all(projects.map((project) => getProjectData(project.id)));

  return projectData.flatMap((data) =>
    (data.tasks ?? []).map((task) => ({
      ...task,
      projectId: task.projectId || data.project.id,
      projectName: data.project.name,
      projectColor: data.project.color,
    })),
  );
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
  return request<Task>("/task", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTask(task: Task): Promise<Task> {
  return request<Task>(`/task/${encodeURIComponent(task.id)}`, {
    method: "POST",
    body: JSON.stringify(toApiTask(task)),
  });
}

export async function completeTask(task: Pick<Task, "id" | "projectId">): Promise<void> {
  await request<void>(`/project/${encodeURIComponent(task.projectId)}/task/${encodeURIComponent(task.id)}/complete`, {
    method: "POST",
  });
}

export function describeApiError(error: unknown): string {
  if (error instanceof Dida365Error) {
    const detail = error.body ? ` ${error.body.slice(0, 180)}` : "";
    return `${error.message}.${detail}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function toApiTask(task: Task): Task {
  const apiTask = { ...task };
  delete apiTask.projectName;
  delete apiTask.projectColor;

  return apiTask;
}
