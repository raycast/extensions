export type ProjectType = string;

export type ProjectCategory = {
  id: string;
  name: string;
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
  startedAt: string;
  endedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ActiveTimer = {
  id: string;
  projectId: string;
  description: string;
  startedAt: string;
};

export type ReportPeriod = "today" | "week" | "month";
