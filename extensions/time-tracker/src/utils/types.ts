export interface Project {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  createdAt: string;
}

export interface TimeEntry {
  id: string;
  projectId: string;
  date: string; // ISO date format YYYY-MM-DD
  duration: number; // in hours (decimal)
  comment: string;
  createdAt: string; // ISO datetime
}

export interface TimeData {
  projects: Project[];
  entries: TimeEntry[];
}

export interface NewTimeEntry {
  projectId: string;
  date: string;
  duration: number;
  comment: string;
}

export interface NewProject {
  name: string;
  color: string;
}
