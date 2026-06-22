export interface Task {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  desc?: string;
  dueDate?: string; // "2024-01-15T00:00:00.000+0000"
  startDate?: string;
  priority: 0 | 1 | 3 | 5; // 0=none, 1=low, 3=medium, 5=high
  status: 0 | 2; // 0=active, 2=completed
  items?: SubTask[];
  tags?: string[];
  reminder?: string;
  reminders?: Reminder[];
  repeatFlag?: string;
  parentId?: string;
  childIds?: string[];
  kind?: string;
  modifiedTime?: string;
  createdTime?: string;
  timeZone?: string;
  isAllDay?: boolean;
  sortOrder?: number;
  columnId?: string;
  completedTime?: string;
  deleted?: number;
  focusSummaries?: FocusSummary[];
}

export interface SubTask {
  id: string;
  title: string;
  status: 0 | 2;
  sortOrder?: number;
  startDate?: string;
  isAllDay?: boolean;
  timeZone?: string;
  completedTime?: string;
}

export interface Reminder {
  id: string;
  trigger: string;
}

export interface FocusSummary {
  pomodoroSummaries?: unknown[];
  estimatedDuration?: number;
  estimatedPomodoroNum?: number;
  focusedSeconds?: number;
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  kind?: string;
  viewMode?: string;
  sortOrder?: number;
  closed?: boolean;
  groupId?: string;
  isOwner?: boolean;
  permission?: string;
}

export interface ProjectGroup {
  id: string;
  name: string;
  sortOrder?: number;
  viewMode?: string;
  listType?: string;
}

export interface Tag {
  name: string;
  label?: string;
  color?: string;
  sortOrder?: number;
  rawName?: string;
}

export interface Habit {
  id: string;
  name: string;
  color?: string;
  iconRes?: string;
  goal: number;
  step: number;
  unit?: string;
  type?: string;
  status: number;
  createdTime?: string;
  modifiedTime?: string;
  encouragement?: string;
  totalCheckIns?: number;
  completedCount?: number;
  archivedCount?: number;
  section?: HabitSection;
  reminders?: HabitReminder[];
  repeatRule?: string;
  etag?: string;
  ex_goal?: number;
}

export interface HabitSection {
  id: string;
  name: string;
  sortOrder?: number;
}

export interface HabitReminder {
  id?: string;
  trigger: string;
}

export interface HabitCheckin {
  habitId: string;
  stampDate: string; // "20240115"
  value?: number;
  status?: number;
  goal?: number;
  checkinTime?: string;
  id?: string;
}

export interface FocusRecord {
  id?: string;
  startTime: string;
  endTime: string;
  duration: number;
  pomodoroType?: string;
  taskId?: string;
  taskTitle?: string;
  note?: string;
  status?: number;
}

export interface BatchSyncResponse {
  syncTaskBean: {
    update: Task[];
    delete?: Array<{ taskId: string; projectId: string }>;
    empty?: boolean;
  };
  projectProfiles: Project[];
  projectGroups?: ProjectGroup[];
  tags?: Tag[];
  inboxId: string;
  checkPoint?: number;
  filters?: Filter[];
}

export interface Filter {
  id: string;
  name: string;
  rule?: string;
  sortOrder?: number;
}

export interface LoginResponse {
  token: string;
  userId: string;
  username?: string;
  inboxId?: string;
}

export interface CreateTaskPayload {
  title: string;
  projectId?: string;
  dueDate?: string;
  priority?: 0 | 1 | 3 | 5;
  content?: string;
  tags?: string[];
  isAllDay?: boolean;
  startDate?: string;
  timeZone?: string;
  items?: Partial<SubTask>[];
  reminders?: Reminder[];
  repeatFlag?: string;
  columnId?: string;
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {
  id: string;
  projectId: string;
  status?: 0 | 2;
  columnId?: string;
  reminders?: Reminder[];
  repeatFlag?: string;
}

export type PriorityLabel = "None" | "Low" | "Medium" | "High";

export const PRIORITY_LABELS: Record<number, PriorityLabel> = {
  0: "None",
  1: "Low",
  3: "Medium",
  5: "High",
};

export const PRIORITY_COLORS: Record<number, string> = {
  0: "#8e8e93",
  1: "#34c759",
  3: "#ff9500",
  5: "#ff3b30",
};
