export interface TimeEntry {
  id: string;
  projectId: string;
  description: string;
  project: Project;
  timeInterval: {
    start: string;
    end: string;
  };
}

export interface Task {
  id: string;
  name: string;
}

export interface Project {
  id: string;
  clientName?: string;
  description?: string;
  name: string;
  color: string;
  tasks: Task[];
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

export interface PreferenceValues {
  token: string;
}

export interface DataValues {
  userId: LocalStorageValue;
  workspaceId: LocalStorageValue;
  name: LocalStorageValue;
}
