export type TodoStatus = "TODO" | "NOW" | "WAITING" | "LATER" | "DOING" | "DONE" | "CANCELED";
export type Priority = "A" | "B" | "C";
export type ViewMode = "list" | "board";

export interface Todo {
  content: string;
  page: string;
  completed: boolean;
  status: TodoStatus;
  priority: Priority;
  tags?: string[];
  dueDate?: string;
}

export interface Note {
  content: string;
  page: string;
  tags?: string[];
  createdAt: string;
}

export interface Preferences {
  logseqPath: string;
  defaultPage: string;
  defaultViewMode?: ViewMode;
}
