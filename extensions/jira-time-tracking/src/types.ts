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

export type Preferences = {
  domain: string;
  token: string;
  username: string;
};

export type Issue = {
  key: string;
  fields: {
    summary: string;
  };
};

export type IssueBody = {
  issues: Issue[];
} & unknown;

export type ProjectBody = {
  values: { key: string; name: string }[];
} & unknown;

export type JiraErrorResponseBody = {
  message?: string;
  messages?: string[];
} & unknown;
