export interface Task {
  id: string;
  path: string;
  title: string;
  status: string;
  priority: string;
  due: string | null;
  scheduled: string | null;
  contexts: string[];
  projects: string[];
  tags: string[];
  dateCreated: string;
  dateModified: string;
  archived: boolean;
}

export interface TaskCreateInput {
  title: string;
}

export interface APIError {
  message: string;
  code?: string;
}

export interface Preferences {
  apiPort: string;
  apiToken?: string;
}

export interface PriorityOption {
  id: string;
  value: string;
  label: string;
  color: string;
  weight: number;
}

export interface FilterOptions {
  projects: string[];
  tags: string[];
  priorities: PriorityOption[];
}
