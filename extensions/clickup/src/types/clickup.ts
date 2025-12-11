/**
 * Comprehensive ClickUp API types
 */

export interface ClickUpStatus {
  color: string;
  id?: string;
  orderindex?: number;
  status: string;
  type?: string;
}

export interface ClickUpUser {
  color?: string;
  email?: string;
  id: number;
  initials?: string;
  profilePicture?: string | null;
  username: string;
}

export interface ClickUpPriority {
  color: string;
  id: string;
  orderindex?: string;
  priority: string;
}

export interface ClickUpTag {
  creator?: number;
  name: string;
  tag_bg: string;
  tag_fg: string;
}

export interface ClickUpCustomField {
  date_created?: string;
  hide_from_guests?: boolean;
  id: string;
  name: string;
  required?: boolean;
  type: string;
  type_config?: Record<string, unknown>;
  value?: string | number | boolean | null;
}

export interface ClickUpList {
  access?: boolean;
  archived?: boolean;
  content?: string;
  due_date?: string | null;
  folder?: ClickUpFolder;
  id: string;
  name: string;
  priority?: ClickUpPriority | null;
  space?: ClickUpSpace;
  start_date?: string | null;
  statuses?: ClickUpStatus[];
  task_count?: number;
  team_id?: string;
  url?: string;
}

export interface ClickUpFolder {
  access?: boolean;
  hidden?: boolean;
  id: string;
  lists?: ClickUpList[];
  name: string;
  space?: ClickUpSpace;
  task_count?: number;
}

export interface ClickUpSpace {
  access?: boolean;
  archived?: boolean;
  features?: Record<string, unknown>;
  id: string;
  multiple_assignees?: boolean;
  name: string;
  private?: boolean;
  statuses?: ClickUpStatus[];
}

export interface ClickUpTask {
  archived?: boolean;
  assignees: ClickUpUser[];
  checklists?: unknown[];
  creator: ClickUpUser;
  custom_fields: ClickUpCustomField[];
  custom_id: string | null;
  date_closed: string | null;
  date_created: string;
  date_done: string | null;
  date_updated: string;
  dependencies?: unknown[];
  description?: string | null;
  due_date: string | null;
  folder?: ClickUpFolder;
  id: string;
  linked_tasks?: unknown[];
  list: ClickUpList;
  locations?: unknown[];
  name: string;
  orderindex: string;
  parent: string | null;
  permission_level?: string;
  points: number | null;
  priority: ClickUpPriority | null;
  project?: ClickUpFolder;
  sharing?: {
    public?: boolean;
    public_fields?: string[];
    public_share_expires_on?: string | null;
    seo_optimized?: boolean;
    token?: string | null;
  };
  space: ClickUpSpace;
  start_date: string | null;
  status: ClickUpStatus;
  tags: ClickUpTag[];
  team_id: string;
  text_content?: string | null;
  time_estimate: number | null;
  time_spent: number | null;
  url: string;
  watchers?: ClickUpUser[];
}

// ============================================
// API Response Types
// ============================================

export interface GetTasksResponse {
  last_page?: boolean;
  tasks: ClickUpTask[];
}

export interface GetSpacesResponse {
  spaces: ClickUpSpace[];
}

export interface GetListsResponse {
  lists: ClickUpList[];
}

export interface GetFoldersResponse {
  folders: ClickUpFolder[];
}

export interface GetAuthenticatedUserResponse {
  user: ClickUpAuthenticatedUser;
}

// ============================================
// API Request Types
// ============================================

export interface GetTasksParams {
  archived?: boolean;
  assignees?: number[];
  custom_fields?: Array<{
    field_id: string;
    operator: string;
    value: string | number;
  }>;
  date_created_gt?: number;
  date_created_lt?: number;
  date_updated_gt?: number;
  date_updated_lt?: number;
  due_date_gt?: number;
  due_date_lt?: number;
  include_closed?: boolean;
  order_by?: string;
  page?: number;
  reverse?: boolean;
  statuses?: string[];
  subtasks?: boolean;
  tags?: string[];
}

export interface UpdateTaskParams {
  archived?: boolean;
  assignees?: {
    add?: number[];
    rem?: number[];
  };
  description?: string;
  due_date?: number | null;
  due_date_time?: boolean;
  name?: string;
  priority?: number | null;
  start_date?: number | null;
  start_date_time?: boolean;
  status?: string;
}

// ============================================
// Error Types
// ============================================

export interface ClickUpErrorResponse {
  ECODE: string;
  err: string;
}

// ============================================
// User Types
// ============================================

export interface ClickUpAuthenticatedUser {
  color: string;
  email: string;
  global_font_support: boolean;
  id: number;
  initials: string;
  profilePicture: string | null;
  timezone: string;
  username: string;
  week_start_day: number | null;
}
