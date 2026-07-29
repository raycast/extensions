export type TeamworkTask = {
  id: number;
  name: string;
  projectId: number;
  projectName?: string;
  tasklistName?: string;
  dueDate?: string;
  status?: string;
};

export type TeamworkTimer = {
  id: number;
  taskId: number;
  projectId: number;
  description?: string;
  running: boolean;
  duration?: number;
  lastStartedAt?: string;
  serverTime?: string;
  taskName?: string;
  projectName?: string;
};
