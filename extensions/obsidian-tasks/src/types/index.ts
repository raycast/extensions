export enum Priority {
  HIGHEST = "highest",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  LOWEST = "lowest",
}

export const PRIORITY_VALUES = [
  Priority.HIGHEST,
  Priority.HIGH,
  Priority.MEDIUM,
  Priority.LOW,
  Priority.LOWEST,
] as const;

export interface Task {
  id: string;
  description: string;
  completed: boolean;
  dueDate?: Date;
  scheduledDate?: Date;
  startDate?: Date;
  priority?: Priority;
  tags?: string[];
  recurrence?: string;
  createdAt: Date;
  completedAt?: Date;
  line: number; // Line number in the markdown file
  filePath: string | null; // Path to the file containing this task
  indentation: string; // Indentation of the task (spaces/tabs)
}

export interface TaskFile {
  content: string;
  tasks: Task[];
  path: string;
}
