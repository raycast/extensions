export interface Worklog {
  tempoWorklogId: number;
  issue: {
    id: number;
    self: string;
    key?: string;
    summary?: string;
    iconUrl?: string;
  };
  timeSpentSeconds: number;
  startDate: string;
  startTime?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorklogsByDate {
  [date: string]: {
    worklogs: Worklog[];
    totalSeconds: number;
  };
}

export interface TempoWorklogsResponse {
  results: Worklog[];
  metadata?: {
    count: number;
    offset: number;
    limit: number;
  };
}

export interface JiraUser {
  accountId: string;
  emailAddress: string;
  displayName: string;
  active: boolean;
}
