import fetch from 'node-fetch';
import { getPreferenceValues } from '@raycast/api';

interface Preferences {
  apiKey: string;
}

interface WorkspaceResponse {
  id: string;
  name: string;
  createdTime: string;
}

interface ProjectResponse {
  id: string;
  createdTime: string;
  name: string;
  workspaceId: string;
  description?: string;
  deadline?: string;
  status: {
    name: string;
    type: string;
  };
}

interface TaskResponse {
  id: string;
  createdTime: string;
  name: string;
  workspaceId: string;
  projectId?: string;
  description?: string;
  deadline?: string;
  status: {
    name: string;
    type: string;
  };
  priority?: {
    name: string;
    type: string;
  };
}

interface ScheduleResponse {
  tasks: TaskResponse[];
  projects: ProjectResponse[];
}

const API_BASE_URL = 'https://api.usemotion.com/api/v1';

export class MotionAPI {
  private apiKey: string;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    this.apiKey = preferences.apiKey;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async getWorkspaces(): Promise<WorkspaceResponse[]> {
    return this.fetch<WorkspaceResponse[]>('/workspaces');
  }

  async getWorkspace(id: string): Promise<WorkspaceResponse> {
    return this.fetch<WorkspaceResponse>(`/workspaces/${id}`);
  }

  async getProjects(workspaceId?: string): Promise<ProjectResponse[]> {
    const endpoint = workspaceId ? `/projects?workspaceId=${workspaceId}` : '/projects';
    return this.fetch<ProjectResponse[]>(endpoint);
  }

  async getProject(id: string): Promise<ProjectResponse> {
    return this.fetch<ProjectResponse>(`/projects/${id}`);
  }

  async getTasks(workspaceId?: string): Promise<TaskResponse[]> {
    const endpoint = workspaceId ? `/tasks?workspaceId=${workspaceId}` : '/tasks';
    return this.fetch<TaskResponse[]>(endpoint);
  }

  async getTask(id: string): Promise<TaskResponse> {
    return this.fetch<TaskResponse>(`/tasks/${id}`);
  }

  async getSchedule(workspaceId: string): Promise<ScheduleResponse> {
    return this.fetch<ScheduleResponse>(`/schedules/${workspaceId}`);
  }
}

export const motionAPI = new MotionAPI();
