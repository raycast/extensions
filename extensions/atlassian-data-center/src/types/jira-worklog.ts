import type { ProcessedWorklog } from "@/types";

export type JiraWorklogsResponse = JiraWorklog[];

export type JiraWorklog = {
  /** Tempo Worklog ID, e.g. `12345` */
  originId: number;
  /** Origin task ID (Jira Issue ID), e.g. `12345` */
  originTaskId: number;
  /** Jira User key, e.g. `JIRAUSER12345` */
  worker?: string;
  /** Jira User key, e.g. `JIRAUSER12345` */
  updater?: string;
  /** Worklog start time, e.g. `2025-11-10 00:00:00.000` */
  started: string;
  /** Date created, e.g. `2025-11-10 23:30:33.000` */
  dateCreated: string;
  /** Date updated, e.g. `2025-11-10 23:30:33.000` */
  dateUpdated: string;
  /** Time spent in human-readable format, e.g. `1m`, `2h 30m` */
  timeSpent: string;
  /** Tempo worklog ID, e.g. `12345` */
  tempoWorklogId: number;
  /** Time spent in seconds, e.g. `60` */
  timeSpentSeconds: number;
  /** Billable seconds, e.g. `60` */
  billableSeconds: number;
  /** Worklog comment, e.g. `test` */
  comment: string;
  /** Custom attributes, e.g. `{}` */
  attributes: Record<string, unknown>;
  /** Worklog location */
  location: {
    /** Location name, e.g. `Default Location` */
    name: string;
    /** Location ID, e.g. `1` */
    id: number;
  };
  /** Related issue information */
  issue: {
    /** Issue ID, e.g. `12345` */
    id: number;
    /** Issue key, e.g. `DEV-123` */
    key: string;
    /** Epic key (if issue belongs to an epic), e.g. `DEV-100` */
    epicKey?: string;
    /** Epic issue information (if issue belongs to an epic) */
    epicIssue?: {
      /** Epic issue type, e.g. `Epic` */
      issueType: string;
      /** Epic issue type icon URL, e.g. `/secure/viewavatar?size=xsmall&avatarId=10000&avatarType=issuetype` */
      iconUrl: string;
      /** Epic issue summary, e.g. `Example Epic Summary` */
      summary: string;
      /** Epic estimated remaining time in seconds, e.g. `0` */
      estimatedRemainingSeconds?: number;
    };
    /** Reporter user key or display name, e.g. `JIRAUSER12345` or `John Doe` */
    reporterKey: string;
    /** Estimated remaining time in seconds, e.g. `323940` */
    estimatedRemainingSeconds?: number;
    /** Original estimate in seconds, e.g. `592200` */
    originalEstimateSeconds?: number;
    /** Issue status, e.g. `Backlog` */
    issueStatus: string;
    /** Whether the issue is internal, e.g. `false` */
    internalIssue: boolean;
    /** Issue type, e.g. `Task` */
    issueType: string;
    /** Project ID, e.g. `10000` */
    projectId: number;
    /** Project key, e.g. `DEV` */
    projectKey: string;
    /** Issue type icon URL, e.g. `/secure/viewavatar?size=xsmall&avatarId=10000&avatarType=issuetype` */
    iconUrl: string;
    /** Issue summary, e.g. `Example Issue Summary` */
    summary: string;
    /** Issue components, e.g. `[]` */
    components: unknown[];
    /** Issue versions, e.g. `[]` */
    versions: unknown[];
  };
};

export type JiraWorklogCreateParams = {
  attributes?: Record<string, unknown>;
  billableSeconds?: string;
  worker: string;
  comment: string;
  started: string;
  originTaskId: string;
  timeSpentSeconds: number;
  remainingEstimate: number | null;
  endDate: string | null;
  includeNonWorkingDays: boolean;
};

export type JiraWorklogUpdateParams = {
  originTaskId: string;
  originId: number;
  started: string;
  timeSpentSeconds: number;
  remainingEstimate: number | null;
  endDate: string | null;
  includeNonWorkingDays: boolean;
};

export type WorklogGroup = {
  date: string;
  totalTimeSpent: string;
  totalTimeSpentSeconds: number;
  items: ProcessedWorklog[];
  title: string;
  subtitle: string;
};
