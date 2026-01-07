// Pylon API Types

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  status?: string;
}

export interface Account {
  id: string;
  name: string;
  domain?: string;
  domains?: string[];
  logo_url?: string;
  type?: string;
  tags?: string[];
}

export interface Project {
  id: string;
  name: string;
  account_id: string;
}

export interface Milestone {
  id: string;
  name: string;
  project_id: string;
}

// Issue states from Pylon API
export type IssueState = "new" | "waiting_on_you" | "waiting_on_customer" | "on_hold" | "closed";

// Task status for our local task representation
export type TaskStatus = "not_started" | "in_progress" | "completed" | "canceled";

// Pylon Issue (what the API returns)
export interface Issue {
  id: string;
  number: number;
  title: string;
  body_html?: string;
  state: IssueState;
  account?: { id: string };
  assignee?: { id: string };
  requester?: { id: string };
  link?: string;
  type?: string;
  source?: string;
  created_at: string;
  customer_portal_visible: boolean;
  tags?: string[];
}

// Task (internal representation that maps to Issue or created Task)
export interface Task {
  id: string;
  title: string;
  body_html?: string;
  status: TaskStatus;
  state?: IssueState; // For issues
  account_id?: string;
  account?: Account;
  assignee_id?: string;
  assignee?: User;
  project_id?: string;
  project?: Project;
  milestone_id?: string;
  milestone?: Milestone;
  due_date?: string;
  customer_portal_visible: boolean;
  created_at: string;
  updated_at?: string;
  link?: string;
  type?: string;
}

export interface CreateTaskPayload {
  title: string;
  account_id?: string;
  assignee_id?: string;
  body_html?: string;
  due_date?: string;
  project_id?: string;
  milestone_id?: string;
  status?: TaskStatus;
  customer_portal_visible?: boolean;
}

export interface UpdateTaskPayload {
  title?: string;
  body_html?: string;
  status?: TaskStatus;
  assignee_id?: string;
  project_id?: string;
  milestone_id?: string;
  due_date?: string;
  customer_portal_visible?: boolean;
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  request_id?: string;
  pagination?: {
    cursor?: string;
    has_more: boolean;
  };
}

export interface SearchRequest {
  filters?: Record<string, unknown>;
  pagination?: {
    cursor?: string;
    size?: number;
  };
}

/**
 * Mapping from IssueState to TaskStatus
 */
const ISSUE_STATE_TO_TASK_STATUS: Record<IssueState, TaskStatus> = {
  new: "not_started",
  waiting_on_you: "not_started",
  waiting_on_customer: "in_progress",
  on_hold: "in_progress",
  closed: "completed",
};

/**
 * Mapping from TaskStatus to IssueState (for updating issues)
 * Note: Multiple statuses can map to the same state
 */
const TASK_STATUS_TO_ISSUE_STATE: Record<TaskStatus, IssueState> = {
  not_started: "new",
  in_progress: "waiting_on_customer",
  completed: "closed",
  canceled: "closed",
};

/**
 * Map issue state to task status
 */
export function issueStateToTaskStatus(state: IssueState): TaskStatus {
  return ISSUE_STATE_TO_TASK_STATUS[state] ?? "not_started";
}

/**
 * Map task status to issue state
 */
export function taskStatusToIssueState(status: TaskStatus): IssueState {
  return TASK_STATUS_TO_ISSUE_STATE[status];
}

// Convert Issue to Task
export function issueToTask(issue: Issue): Task {
  return {
    id: issue.id,
    title: issue.title,
    body_html: issue.body_html,
    status: issueStateToTaskStatus(issue.state),
    state: issue.state,
    account_id: issue.account?.id,
    assignee_id: issue.assignee?.id,
    customer_portal_visible: issue.customer_portal_visible,
    created_at: issue.created_at,
    link: issue.link,
    type: issue.type,
  };
}
