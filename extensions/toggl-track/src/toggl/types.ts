// https://developers.track.toggl.com/docs/api/me#response
export interface Me {
  default_workspace_id: number;
}

// https://developers.track.toggl.com/docs/api/workspaces#response-4
export interface Workspace {
  id: number;
  name: string;
  premium: boolean;
}

// https://developers.track.toggl.com/docs/api/projects/index.html#response-8
export interface Project {
  active: boolean;
  billable: boolean;
  client_id: number;
  color: string;
  id: number;
  name: string;
  workspace_id: number;
}

// https://developers.track.toggl.com/docs/api/clients#response
export interface Client {
  id: number;
  name: string;
}

// https://developers.track.toggl.com/docs/api/tags#response
export interface Tag {
  id: number;
  name: string;
  workspace_id: number;
}

// https://developers.track.toggl.com/docs/api/tasks/index.html#response
export interface Task {
  active: boolean;
  id: number;
  name: string;
  project_id: number;
  workspace_id: number;
  user_id: number | null;
}

// https://developers.track.toggl.com/docs/api/time_entries#response
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
