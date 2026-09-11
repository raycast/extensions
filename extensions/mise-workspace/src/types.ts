export type ApiConfig = {
  baseUrl: string; // e.g., https://api.mise.work
  token: string; // Bearer <token>
};

export type TaskLite = {
  _id: string;
  _creationTime: number;
  updatedAt?: number; // server now includes updatedAt for caching/sorting
  sortOrder?: number; // server provides sortOrder for ordering
  title: string;
  status: "todo" | "progress" | "review" | "done";
  projectId?: string;
  projectName?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  dueDate?: number | null;
  description?: string | null;
  descriptionMarkdown?: string | null;
  subtasks?: Subtask[];
  hasSubtasks?: boolean;
  subtasksTotal?: number;
  subtasksCompleted?: number;
};

export type ProjectLite = { _id: string; name: string };
export type UserLite = {
  _id: string;
  name: string | null;
  email: string | null;
};

export type Subtask = {
  id: string;
  text: string;
  completed: boolean;
};
