/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TimeEntry {
  id: string;
  projectId: string;
  taskId: string | undefined;
  description: string;
  tags: Tag[];
  project: Project;
  task: Task | undefined;
  timeInterval: {
    start: string;
    end: string;
  };
}

export interface Project {
  id: string;
  clientName?: string;
  description?: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  name: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface FetcherArgs {
  method?: "PATCH" | "POST" | "GET" | "DELETE";
  body?: any;
  headers?: {
    "X-Api-Key": string;
    "Content-Type": string;
  };
}

export interface User {
  id: string;
  name: string;
  defaultWorkspace: string;
}

export interface FetcherResponse {
  data?: any;
  error?: string | Error;
}

export interface DataValues {
  userId: string;
  workspaceId: string;
  name: string;
}
