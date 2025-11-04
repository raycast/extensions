// TaskNotes API Client

import { getPreferenceValues } from "@raycast/api";
import {
  TasksResponse,
  TaskResponse,
  CreateTaskInput,
  UpdateTaskInput,
  HealthResponse,
  PomodoroStatusResponse,
  PomodoroStartResponse,
  ApiResponse,
  NLPParseInput,
  NLPParseResponse,
  NLPCreateResponse,
} from "./types";

interface Preferences {
  apiUrl: string;
  apiPort: string;
  apiToken?: string;
}

export class TaskNotesClient {
  private baseUrl: string;
  private token?: string;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    const url = preferences.apiUrl || "http://localhost";
    const port = preferences.apiPort || "8080";
    this.baseUrl = `${url}:${port}/api`;
    this.token = preferences.apiToken;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Merge in any existing headers from options
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === "string") {
          headers[key] = value;
        }
      });
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  // Health Check
  async checkHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>("/health");
  }

  // Task Operations
  async listTasks(): Promise<TasksResponse> {
    // The API doesn't support query parameters on GET /api/tasks
    // We just fetch all tasks and filter client-side
    return this.request<TasksResponse>("/tasks");
  }

  async getTask(taskId: string): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/tasks/${encodeURIComponent(taskId)}`);
  }

  async createTask(task: CreateTaskInput): Promise<TaskResponse> {
    return this.request<TaskResponse>("/tasks", {
      method: "POST",
      body: JSON.stringify(task),
    });
  }

  async updateTask(taskId: string, updates: UpdateTaskInput): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/tasks/${encodeURIComponent(taskId)}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(taskId: string): Promise<ApiResponse> {
    return this.request<ApiResponse>(`/tasks/${encodeURIComponent(taskId)}`, {
      method: "DELETE",
    });
  }

  // Task Actions
  async toggleTaskStatus(taskId: string): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/tasks/${encodeURIComponent(taskId)}/toggle-status`, {
      method: "POST",
    });
  }

  async toggleArchive(taskId: string): Promise<TaskResponse> {
    return this.request<TaskResponse>(`/tasks/${encodeURIComponent(taskId)}/archive`, {
      method: "POST",
    });
  }

  // Pomodoro Operations
  async getPomodoroStatus(): Promise<PomodoroStatusResponse> {
    return this.request<PomodoroStatusResponse>("/pomodoro/status");
  }

  async startPomodoro(taskId?: string): Promise<PomodoroStartResponse> {
    const body = taskId ? { taskId } : {};
    return this.request<PomodoroStartResponse>("/pomodoro/start", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async stopPomodoro(): Promise<ApiResponse> {
    return this.request<ApiResponse>("/pomodoro/stop", {
      method: "POST",
    });
  }

  async pausePomodoro(): Promise<ApiResponse> {
    return this.request<ApiResponse>("/pomodoro/pause", {
      method: "POST",
    });
  }

  async resumePomodoro(): Promise<ApiResponse> {
    return this.request<ApiResponse>("/pomodoro/resume", {
      method: "POST",
    });
  }

  // NLP Operations
  async parseNLP(input: NLPParseInput): Promise<NLPParseResponse> {
    return this.request<NLPParseResponse>("/nlp/parse", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async createTaskNLP(input: NLPParseInput): Promise<NLPCreateResponse> {
    return this.request<NLPCreateResponse>("/nlp/create", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
}

// Singleton instance
let clientInstance: TaskNotesClient | null = null;

export function getClient(): TaskNotesClient {
  if (!clientInstance) {
    clientInstance = new TaskNotesClient();
  }
  return clientInstance;
}

// Helper to reset client (useful when preferences change)
export function resetClient(): void {
  clientInstance = null;
}
