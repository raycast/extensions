import { getPreferenceValues } from "@raycast/api";
import type { Project, ProjectDetail, Task, Notification, TaskRelation, Column } from "../types";
import { normalizeInstanceUrl } from "../lib/url";

export class KaneoAPI {
  private instanceUrl: string;
  private apiToken: string;
  private workspaceId: string;
  private requestTimeout: number;

  constructor() {
    const prefs = getPreferenceValues();
    this.instanceUrl = normalizeInstanceUrl(prefs.instanceUrl);
    this.apiToken = prefs.apiToken;
    this.workspaceId = prefs.workspaceId;
    this.requestTimeout = Number(prefs.requestTimeout);
  }

  private async request<T>(path: string, init?: RequestInit, timeoutMs = this.requestTimeout): Promise<T> {
    const url = `${this.instanceUrl}${path}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiToken}`,
          ...init?.headers,
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Kaneo API error: ${res.status} ${res.statusText}`);
      }

      if (res.status === 204) {
        return undefined as T;
      }

      return (await res.json()) as T;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new Error(`Kaneo API error: request to ${path} timed out after ${timeoutMs}ms`);
      }
      if (error instanceof SyntaxError) {
        throw new Error(
          "Kaneo returned an unexpected response instead of JSON. Please check that your API URL is correct in the extension preferences.",
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async assignTask(taskId: string, assigneeId: string | null) {
    return this.request<Task>(`/api/task/assignee/${taskId}`, {
      method: "PUT",
      body: JSON.stringify({ userId: assigneeId }),
    });
  }

  async getProjects(workspaceId: string): Promise<Project[]> {
    return this.request<Project[]>(`/api/project?workspaceId=${workspaceId}`);
  }

  async getProjectTasks(projectId: string): Promise<ProjectDetail> {
    return this.request<ProjectDetail>(`/api/task/tasks/${projectId}`);
  }

  async getWorkspaceBoard(workspaceId: string): Promise<Array<{ project: Project; columns: Column[] }>> {
    const projects = await this.getProjects(workspaceId);
    return Promise.all(
      projects.map(async (project) => {
        try {
          const detail = await this.getProjectTasks(project.id.toString());
          return { project, columns: detail?.data?.columns ?? detail?.columns ?? [] };
        } catch (error) {
          // One project failing must not break the whole overview — skip it and
          // keep the tasks from the other projects.
          console.error(`Kaneo: skipping project "${project.name}" — failed to load its tasks:`, error);
          return { project, columns: [] as Column[] };
        }
      }),
    );
  }

  async getTask(taskId: string): Promise<Task> {
    const relations = await this.request<TaskRelation[]>(`/api/task-relation/${taskId}`);
    const parentTasks = relations
      .filter((relation) => relation.targetTaskId === taskId && relation.relationType === "subtask")
      .map((relation) => relation.sourceTask);
    const subTasks = relations
      .filter((relation) => relation.sourceTaskId === taskId && relation.relationType === "subtask")
      .map((relation) => relation.targetTask);
    const task = await this.request<Task>(`/api/task/${taskId}`);
    return {
      ...task,
      parentTasks,
      subTasks,
    };
  }

  async createProject(body: { name: string; slug: string; icon: string }): Promise<Project> {
    return this.request<Project>("/api/project", {
      method: "POST",
      body: JSON.stringify({ ...body, icon: "", workspaceId: this.workspaceId }),
    });
  }

  async createTask(
    projectId: string,
    body: { title: string; description?: string; status: string; priority: string; dueDate?: string },
  ): Promise<Task> {
    return this.request<Task>(`/api/task/${projectId}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async updateTaskStatus(taskId: string, status: string): Promise<Task> {
    return this.request<Task>(`/api/task/status/${taskId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
  }

  async updateTaskPriority(taskId: string, priority: string): Promise<Task> {
    return this.request<Task>(`/api/task/priority/${taskId}`, {
      method: "PUT",
      body: JSON.stringify({ priority }),
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    return this.request<void>(`/api/task/${taskId}`, {
      method: "DELETE",
    });
  }

  async deleteProject(projectId: number): Promise<void> {
    return this.request<void>(`/api/project/${projectId}?workspaceId=${this.workspaceId}`, {
      method: "DELETE",
    });
  }

  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>("/api/notification");
  }

  async markNotificationRead(id: string): Promise<void> {
    return this.request<void>(`/api/notification/${id}/read`, { method: "PATCH" });
  }

  async markAllNotificationsRead(): Promise<void> {
    return this.request<void>("/api/notification/read-all", { method: "PATCH" });
  }

  async clearNotifications(): Promise<void> {
    return this.request<void>("/api/notification/clear-all", { method: "DELETE" });
  }
}
