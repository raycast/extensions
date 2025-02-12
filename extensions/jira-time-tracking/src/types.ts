export type CommandForm = {
  projectId: string;
  issueId: string;
  startedAt?: string;
  hours?: string;
  minutes?: string;
  seconds?: string;
  description?: string;
};

export type Project = {
  name: string;
  key: string;
};

export type JiraType = "cloud" | "server";

export type Preferences = {
  jiraType: JiraType;
  domain: string;
  token: string;
  username: string;
  customJQL: string;
};

export type Issue = {
  key: string;
  fields: {
    summary: string;
  };
};

export type Result = {
  total: number;
  data: Issue[] | Project[];
};

export type IssueBody = {
  issues: Issue[];
} & unknown;

export type ProjectBody = {
  values: { key: string; name: string }[];
} & unknown;

export type PaginationBody = {
  maxResults: number;
  startAt: number;
  total: number;
};

export type JiraErrorResponseBody = {
  message?: string;
  messages?: string[];
} & unknown;
