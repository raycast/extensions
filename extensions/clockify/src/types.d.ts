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
    end: string | null;
  };
}

export interface Project {
  id: string;
  clientName?: string;
  description?: string;
  name: string;
  color: string;
  // The project's "billable by default" setting. Optional so that an absent value stays
  // distinguishable from false: callers omit the field entirely rather than sending a guess.
  billable?: boolean;
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
  method?: "PATCH" | "POST";
  body?: any;
  headers?: {
    "X-Api-Key": string;
    "Content-Type": string;
  };
}

export interface User {
  id: string;
  name: string;
  // Not guaranteed to be present: Clockify omits/empties these for some accounts.
  defaultWorkspace?: string;
  activeWorkspace?: string;
}

export interface Workspace {
  id: string;
  name: string;
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
