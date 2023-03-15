export interface Me {
  default_workspace_id: number;
}

export interface Workspace {
  id: number;
  name: string;
}

export interface Project {
  billable: boolean;
  client_id: number;
  color: string;
  id: number;
  name: string;
  workspace_id: number;
}

export interface TimeEntry {
  at: string;
  billable: boolean;
  description: string;
  id: number;
  project_id: number;
  start: string;
  duration: number;
  tags: string[];
  workspace_id: number;
}

export interface Client {
  id: number;
  name: string;
}

export interface Tag {
  id: number;
  name: string;
  workspace_id: number;
}
