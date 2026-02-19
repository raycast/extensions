export interface Task {
  id: string;
  projectId: string;
  title: string;
  content?: string;
  desc?: string;
  isAllDay?: boolean;
  startDate?: string;
  dueDate?: string;
  timeZone?: string;
  priority: number; // 0=none, 1=low, 3=medium, 5=high
  status: number; // 0=active, 2=completed
  completedTime?: string;
  sortOrder?: number;
  items?: ChecklistItem[];
  tags?: string[];
}

export interface ChecklistItem {
  id: string;
  title: string;
  status: number;
  sortOrder: number;
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  sortOrder?: number;
  closed?: boolean;
  groupId?: string;
  viewMode?: string;
  kind?: string;
}

export interface ProjectData {
  project: Project;
  tasks: Task[];
}

export interface Preferences {
  apiToken: string;
  defaultProject?: string;
  pomodoroLength?: string;
  shortBreakLength?: string;
  longBreakLength?: string;
}

export interface FocusSession {
  startTime: number;
  duration: number;
  type: "focus" | "shortBreak" | "longBreak";
  sessionsCompleted: number;
}
