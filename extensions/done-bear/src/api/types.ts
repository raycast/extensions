export interface TaskRecord {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  start: string;
  startDate: string | null;
  startBucket: string;
  todayIndexReferenceDate: string | null;
  deadlineAt: string | null;
  creatorId: string;
  workspaceId: string;
  projectId: string | null;
  teamId: string | null;
  assigneeId: string | null;
  headingId: string | null;
  repeatRule: string | null;
  repeatTemplateId: string | null;
}

export interface ProjectRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  status: string;
  sortOrder: number;
  targetDate: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  creatorId: string;
}

export interface TeamRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ChecklistItemRecord {
  id: string;
  title: string;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  taskId: string;
  workspaceId: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  urlKey: string | null;
  logoUrl: string | null;
  role: string;
}

export type TaskView = "inbox" | "today" | "anytime" | "upcoming" | "someday" | "logbook";
export type NavigableView = Exclude<TaskView, "logbook">;
export type TaskState = "open" | "done" | "archived";
