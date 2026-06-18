export type Project = {
  id: string;
  name: string;
  color?: string;
  closed?: boolean;
};

export type TaskPriority = 0 | 1 | 3 | 5;

export type ChecklistItem = {
  id?: string;
  title: string;
  status?: number;
  sortOrder?: number;
};

export type Task = {
  id: string;
  projectId: string;
  projectName?: string;
  projectColor?: string;
  title: string;
  content?: string;
  desc?: string;
  dueDate?: string | null;
  startDate?: string | null;
  timeZone?: string;
  isAllDay?: boolean | null;
  priority?: TaskPriority;
  reminders?: string[];
  items?: ChecklistItem[];
  status?: number;
  sortOrder?: number;
};

export type ProjectData = {
  project: Project;
  tasks?: Task[];
  columns?: unknown[];
};

export type CreateTaskInput = {
  title: string;
  projectId?: string;
  content?: string;
  dueDate?: string;
  startDate?: string;
  timeZone?: string;
  isAllDay?: boolean;
  priority?: TaskPriority;
  reminders?: string[];
  items?: ChecklistItem[];
};
