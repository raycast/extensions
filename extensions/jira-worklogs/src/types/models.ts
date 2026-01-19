export interface Worklog {
  id: string;
  taskId: string;
  description: string;
  startTime: string; // ISO string
  endTime?: string; // ISO string
  durationSeconds?: number;
  taskSummary?: string;
}

export interface JiraIssue {
  key: string;
  summary: string;
}
