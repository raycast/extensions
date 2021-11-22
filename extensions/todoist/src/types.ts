export enum ViewMode {
  project,
  date,
}

export interface SectionWithTasks {
  name: string;
  order?: number;
  tasks: Task[];
}

export interface Project {
  favorite: boolean;
  inbox_project?: boolean;
  id: number;
  name: string;
  url: string;
}

export interface Section {
  id: number;
  name: string;
  order: number;
  project_id: number;
}

export interface Label {
  id: number;
  name: string;
}

export interface DueDate {
  recurring: boolean;
  string: string;
  date: string;
}

export interface Task {
  id: number;
  content: string;
  description: string;
  url: string;
  due?: DueDate;
  priority: number;
  section_id: number;
  project_id: number;
  order: number;
}

export type TaskPayload = Partial<{
  content: string;
  description: string;
  project_id: number;
  priority: number;
  due_date: string;
}>;
