export type TaskStatus = "open" | "completed";
export type TaskPriority = 0 | 1 | 3 | 5;
export type TaskKind = "TEXT" | "CHECKLIST" | "NOTE";

export interface TaskRef {
  id: string;
  projectId: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  status: "open" | "completed";
  sortOrder: number;
  startDate?: string;
  isAllDay?: boolean;
}

export interface Task extends TaskRef {
  title: string;
  projectName: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  kind: TaskKind;
  isAllDay: boolean;
  isFloating: boolean;
  timeZone: string;
  content?: string;
  description?: string;
  startDate?: string;
  dueDate?: string;
  items?: ChecklistItem[];
  exactUrl?: string;
}

export interface CreateTaskInput extends Omit<Partial<Task>, "id" | "projectName" | "status"> {
  title: string;
  projectId?: string;
}

export type UpdateTaskInput = Partial<Omit<CreateTaskInput, "projectId">>;
