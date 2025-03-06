// Define the task types as specified in the requirements
export enum TaskType {
  CALL = "Call",
  TASK = "Task",
  BUG_FIX = "Bug Fix",
  CHANGE_REQUEST = "Change Request",
  QA = "QA",
  ADMINISTRATIVE = "Administrative",
  OTHER = "Other",
}

// Project definition with ID and name
export interface Project {
  id: string;
  name: string;
}

// Task definition with all necessary properties
export interface Task {
  id: string;
  description: string;
  type: TaskType;
  githubUrl?: string;
  startTime: number; // Unix timestamp
  endTime: number; // Unix timestamp
}

// Session definition including related tasks
export interface Session {
  id: string;
  projectId: string;
  startTime: number; // Unix timestamp
  endTime?: number; // Unix timestamp
  tasks: Task[];
}

// Main data structure for storing worklog data
export interface WorklogData {
  projects: Project[];
  sessions: Session[];
  activeSession?: Session;
}

// Interfaces for grouping logs by day and project
export interface DayProject {
  projectName: string;
  tasks: Array<Task & { formattedDuration: string; decimalHours: string; timeRange: string }>;
  totalDuration: number;
  formattedTotalDuration: string;
  totalDecimalHours: string;
}

export interface Day {
  date: string;
  projects: Record<string, DayProject>;
}
