export type Priority = "urgent" | "high" | "medium" | "low" | "none";
export type ActorType = "member" | "agent" | "squad";
export type StatusCategory = "unstarted" | "started" | "done" | "closed";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  issue_prefix?: string | null;
  avatar_url?: string | null;
}

export interface Member {
  id: string;
  user_id: string;
  role: string;
  name: string;
  email: string;
  avatar_url?: string | null;
}

export interface Label {
  id: string;
  name: string;
  color?: string | null;
}

export interface Issue {
  id: string;
  workspace_id: string;
  number: number;
  identifier: string;
  title: string;
  description?: string | null;
  /** Built-in status key or a workspace-defined custom key. */
  status: string;
  status_category?: StatusCategory;
  status_name?: string;
  priority: Priority;
  assignee_type?: ActorType | null;
  assignee_id?: string | null;
  creator_type?: ActorType | null;
  creator_id?: string | null;
  parent_issue_id?: string | null;
  project_id?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at?: string | null;
  labels?: Label[] | null;
}

export interface SearchIssue extends Issue {
  match_source?: string;
  matched_snippet?: string;
  matched_description_snippet?: string;
  matched_comment_snippet?: string;
}

export interface IssueStatus {
  id: string;
  key: string;
  name: string;
  category: StatusCategory;
  color?: string;
  is_system: boolean;
  position: number;
  archived_at?: string | null;
}

export interface Comment {
  id: string;
  issue_id: string;
  author_type: ActorType | "system";
  author_id: string;
  content: string;
  type: string;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type AgentStatus = "idle" | "working" | "blocked" | "error" | "offline";

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  runtime_id: string;
  runtime_availability?: "online" | "unstable" | "offline";
  avatar_url?: string | null;
  model?: string;
  owner_id?: string | null;
  max_concurrent_tasks: number;
  archived_at?: string | null;
}

export interface Runtime {
  id: string;
  name: string;
  custom_name?: string | null;
  runtime_mode: string;
  provider: string;
  status: "online" | "offline";
  device_info?: string;
  owner_id?: string | null;
  last_seen_at?: string | null;
}

export type TaskStatus =
  "queued" | "dispatched" | "running" | "waiting_local_directory" | "deferred" | "completed" | "failed" | "cancelled";

export interface AgentTask {
  id: string;
  agent_id: string;
  runtime_id: string;
  issue_id: string;
  issue_identifier?: string;
  status: TaskStatus;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  error?: string | null;
}

export type InboxSeverity = "action_required" | "attention" | "info";

export interface InboxItem {
  id: string;
  type: string;
  severity: InboxSeverity;
  issue_id?: string | null;
  title: string;
  body?: string | null;
  read: boolean;
  archived: boolean;
  created_at: string;
  issue_status?: string | null;
  issue_priority?: Priority | null;
  actor_type?: ActorType | null;
  actor_id?: string | null;
}

export interface Project {
  id: string;
  title: string;
  icon?: string | null;
  status: string;
}

export interface Squad {
  id: string;
  name: string;
  description: string;
  avatar_url?: string | null;
  leader_id: string;
  member_count: number;
  archived_at?: string | null;
}

/** Agent mode: the agent turns `prompt` into an issue in the background. */
export interface QuickCreateInput {
  prompt: string;
  agent_id?: string;
  squad_id?: string;
  priority?: Exclude<Priority, "none">;
  due_date?: string;
  project_id?: string;
  parent_issue_id?: string;
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  status?: string;
  priority?: Priority;
  assignee_type?: ActorType;
  assignee_id?: string;
  project_id?: string;
  allow_duplicate?: boolean;
}

export type UpdateIssueInput = Partial<{
  title: string;
  description: string;
  status: string;
  priority: Priority;
  assignee_type: ActorType | null;
  assignee_id: string | null;
  project_id: string | null;
}>;
