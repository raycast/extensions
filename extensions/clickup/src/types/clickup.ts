/**
 * ClickUp API Types
 */

export interface ClickUpErrorResponse {
  ECODE: string;
  err: string;
}

export interface ClickUpUser {
  color?: string;
  custom_role?: unknown;
  date_invited?: string;
  date_joined?: string;
  email?: string;
  id: number;
  initials?: string;
  last_active?: string;
  profilePicture?: string | null;
  role?: number;
  username: string;
}

export interface ClickUpStatus {
  color: string;
  id?: string;
  orderindex?: number;
  status: string;
  type?: string;
}

export interface ClickUpPriority {
  color: string;
  id: string;
  orderindex?: number;
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

export interface ClickUpTeam {
  avatar: string | null;
  color: string;
  id: string;
  members: ClickUpTeamMember[];
  name: string;
}

export interface ClickUpTeamMember {
  can_edit_tags?: boolean;
  can_see_points_estimated?: boolean;
  can_see_time_estimated?: boolean;
  can_see_time_spent?: boolean;
  invited_by: ClickUpUser;
  user: ClickUpUser;
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

export interface ClickUpFolder {
  access?: boolean;
  hidden?: boolean;
  id: string;
  lists?: ClickUpList[];
  name: string;
  override_statuses?: boolean;
  permission_level?: string;
  space?: ClickUpSpace;
  task_count?: string;
}

export interface ClickUpList {
  access?: boolean;
  archived?: boolean;
  content?: string;
  due_date?: string | null;
  folder?: ClickUpFolder;
  id: string;
  name: string;
  override_statuses?: boolean;
  permission_level?: string;
  priority?: ClickUpPriority | null;
  space?: ClickUpSpace;
  start_date?: string | null;
  statuses?: ClickUpStatus[];
  task_count?: number | string;
  team_id?: string;
  url?: string;
}

export interface ClickUpChecklist {
  date_created: string;
  id: string;
  items: ClickUpChecklistItem[];
  name: string;
  orderindex: number;
  resolved: number;
  task_id: string;
  unresolved: number;
}

export interface ClickUpChecklistItem {
  assignee: ClickUpUser | null;
  children: unknown[];
  date_created: string;
  id: string;
  name: string;
  orderindex: number;
  parent: string | null;
  resolved: boolean;
}

export interface ClickUpDependency {
  date_created: string;
  depends_on: string;
  task_id: string;
  type: number;
  userid: string;
  workspace_id: string;
}

export interface ClickUpLinkedTask {
  date_created: string;
  link_id: string;
  task_id: string;
  userid: string;
  workspace_id: string;
}

export interface ClickUpTask {
  archived?: boolean;
  assignees: ClickUpUser[];
  checklists?: ClickUpChecklist[];
  creator: ClickUpUser;
  custom_fields?: ClickUpCustomField[];
  custom_id: string | null;
  date_closed: string | null;
  date_created: string;
  date_done: string | null;
  date_updated: string;
  dependencies?: ClickUpDependency[];
  description?: string | null;
  due_date: string | null;
  folder?: ClickUpFolder;
  id: string;
  linked_tasks?: ClickUpLinkedTask[];
  list: ClickUpList;
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
  subtasks?: ClickUpTask[];
  tags: ClickUpTag[];
  team_id: string;
  text_content?: string | null;
  time_estimate: number | null;
  time_spent: number | null;
  url: string;
  watchers?: ClickUpUser[];
}

export interface CreateTaskParams {
  assignees?: number[];
  description?: string;
  due_date?: number;
  due_date_time?: boolean;
  name: string;
  priority?: number;
  start_date?: number;
  start_date_time?: boolean;
  status?: string;
  tags?: string[];
  time_estimate?: number;
}

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

export interface GetTasksResponse {
  last_page?: boolean;
  tasks: ClickUpTask[];
}

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

export interface GetAuthenticatedUserResponse {
  user: ClickUpAuthenticatedUser;
}

/**
 * ClickUp Docs Types (v3 API)
 */

export interface ClickUpDoc {
  creator: number;
  date_created: number;
  date_updated: number;
  deleted: boolean;
  id: string;
  name: string;
  parent: {
    id: string;
    type: number;
  };
  public: boolean;
  type: number;
  workspace_id: number;
}

export interface ClickUpDocPage {
  archived: boolean;
  content: string;
  creator_id: number;
  date_created: number;
  date_updated: number;
  deleted: boolean;
  doc_id: string;
  id: string;
  name: string;
  presentation_details: {
    show_contributor_header: boolean;
  };
  protected: boolean;
  workspace_id: number;
}
