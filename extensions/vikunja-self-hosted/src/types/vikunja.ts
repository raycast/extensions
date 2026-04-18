export interface User {
  created?: string;
  email?: string;
  id?: number;
  name?: string;
  updated?: string;
  username?: string;
}

export interface UserSettings {
  default_project_id?: number;
  discoverable_by_email?: boolean;
  discoverable_by_name?: boolean;
  email_reminders_enabled?: boolean;
  language?: string;
  name?: string;
  overdue_tasks_reminders_enabled?: boolean;
  overdue_tasks_reminders_time?: string;
  timezone?: string;
  week_start?: number;
}

export interface UserWithSettings extends User {
  auth_provider?: string;
  deletion_scheduled_at?: string;
  is_local_user?: boolean;
  settings?: UserSettings;
}

export interface Label {
  created?: string;
  created_by?: User;
  description?: string;
  hex_color?: string;
  id?: number;
  title?: string;
  updated?: string;
}

export interface Project {
  background_blur_hash?: string;
  background_information?: unknown;
  created?: string;
  description?: string;
  hex_color?: string;
  id?: number;
  identifier?: string;
  is_archived?: boolean;
  is_favorite?: boolean;
  max_permission?: number;
  owner?: User;
  parent_project_id?: number;
  position?: number;
  title?: string;
  updated?: string;
}

export interface TaskReminder {
  reminder?: string;
}

export interface Task {
  assignees?: User[];
  bucket_id?: number;
  comment_count?: number;
  cover_image_attachment_id?: number;
  created?: string;
  created_by?: User;
  description?: string;
  done?: boolean;
  done_at?: string;
  due_date?: string;
  end_date?: string;
  hex_color?: string;
  id?: number;
  identifier?: string;
  index?: number;
  is_favorite?: boolean;
  is_unread?: boolean;
  labels?: Label[];
  percent_done?: number;
  position?: number;
  priority?: number;
  project_id?: number;
  reminders?: TaskReminder[];
  repeat_after?: number;
  repeat_mode?: number;
  start_date?: string;
  title?: string;
  updated?: string;
}

export interface TaskWritePayload {
  assignees?: User[];
  bucket_id?: number;
  description?: string;
  done?: boolean;
  due_date?: string;
  end_date?: string;
  hex_color?: string;
  percent_done?: number;
  priority?: number;
  project_id?: number;
  reminders?: TaskReminder[];
  repeat_after?: number;
  repeat_mode?: number;
  start_date?: string;
  title?: string;
}

export interface CreateTaskInput extends TaskWritePayload {
  title: string;
}

export interface LabelTaskBulk {
  labels?: Label[];
}

export interface HttpErrorBody {
  code?: number;
  message?: string;
}

export interface MessageResponse {
  message?: string;
}

export interface TaskListOptions {
  orderBy?: "asc" | "desc";
  searchText?: string;
  sortBy?: string | string[];
}

export interface VikunjaInfo {
  frontend_url?: string;
  version?: string;
}
