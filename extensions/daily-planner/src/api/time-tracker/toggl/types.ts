export interface Me {
  default_workspace_id: number;
}

export interface TimeEntry {
  at: string;
  billable: boolean;
  description: string;
  duration: number; // Not specified in Raycast Toggl Track extension
  id: number;
  project_id: number;
  server_deleted_at: string | null;
  start: string;
  stop: string; // Not specified in Raycast Toggl Track extension
  tags: string[];
  workspace_id: number;
}

export interface Project {
  id: number;
  workspace_id: number;
  client_id: number | null;
  name: string;
  // is_private: boolean;
  // active: boolean;
  color: string;
  billable: boolean;
}

// export interface Client {
//   id: number;
//   name: string;
// }
//
// export interface Tag {
//   id: number;
//   name: string;
//   workspace_id: number;
//   at: string; // ISO 8601
// }
//
// export interface Workspace {
//   id: number;
//   name: string;
//   only_admins_may_create_projects: boolean;
// }
