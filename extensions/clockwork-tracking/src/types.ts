export interface Preferences {
  apiToken: string;
  jiraBaseUrl: string;
  accountId?: string;
}

export interface TrackingState {
  isTracking: boolean;
  issueKey: string | null;
  startedAt: string | null;
}

export interface Worklog {
  id: string;
  issueId: string;
  issueKey?: string;
  issueSummary?: string;
  issueStatus?: string;
  timeSpentSeconds: number;
  started: string;
  authorAccountId?: string;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: Record<string, unknown>;
}

export interface WorklogsResponse {
  worklogs: Worklog[];
  issues?: Record<string, { key: string; summary: string }>;
}

export type DatePeriod = "today" | "yesterday" | "this-week" | "last-7-days" | "this-month";

export const DEFAULT_TRACKING_STATE: TrackingState = {
  isTracking: false,
  issueKey: null,
  startedAt: null,
};
