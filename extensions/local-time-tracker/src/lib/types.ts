export type ProjectType = string;

export type ProjectCategory = {
  id: string;
  name: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  type: ProjectType;
  isActive: boolean;
  isPreferred?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkLog = {
  id: string;
  projectId: string;
  description: string;
  plan?: PlanReference;
  startedAt: string;
  endedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ActiveTimer = {
  id: string;
  projectId: string;
  description: string;
  plan?: PlanReference;
  startedAt: string;
};

// goalId is the existing on-disk field name for the parent plan ID.
export type PlanReference = { goalId: string; taskId?: string };

export type PlannedTask = {
  id: string;
  title: string;
  date?: string;
  completedAt?: string;
};

export type SavedPlan = {
  id: string;
  date: string;
  previousDates?: string[];
  title: string;
  projectId: string;
  tasks: PlannedTask[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportPeriod = "today" | "week" | "month";
