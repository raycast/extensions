/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TimeEntry {
  id: string;
  projectId: string;
  taskId: string | undefined;
  description: string;
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

export interface FetcherArgs {
  method?: string;
  body?: any;
  headers?: {
    "X-Api-Key": any;
    "Content-Type": string;
  };
}

export interface FetcherResponse {
  data?: any;
  error?: string | Error;
}

export type ClockifyRegion = "GLOBAL" | "USA" | "AU" | "EU" | "UK";

export interface PreferenceValues {
  token: string;
  region: ClockifyRegion;
}

export interface DataValues {
  userId: LocalStorageValue;
  workspaceId: LocalStorageValue;
  name: LocalStorageValue;
}
