import { JIRA_ISSUE_TYPE_NAME, JIRA_ISSUE_PRIORITY_NAME } from "@/constants";
import type { ValueOf } from "type-fest";
import type { JiraIssueResponse, JiraSearchIssue, JiraBoardIssue } from "@/types";

export type JiraIssuePriorityName = ValueOf<typeof JIRA_ISSUE_PRIORITY_NAME>;

export type JiraIssueTypeName = ValueOf<typeof JIRA_ISSUE_TYPE_NAME>;

export type JiraIssuePriority = JiraIssueResponse["fields"]["priority"];

export type JiraIssueProject = JiraIssueResponse["fields"]["project"];

export type JiraIssueStatus = JiraIssueResponse["fields"]["status"];

export type JiraIssueTimeTracking = Exclude<JiraIssueResponse["fields"]["timetracking"], Record<string, never>>;

export type JiraIssueType = JiraIssueResponse["fields"]["issuetype"];

export type JiraIssueUser = NonNullable<JiraIssueResponse["fields"]["assignee"]>;

export type JiraIssueAvatarUrls = JiraIssueUser["avatarUrls"];

export type JiraSearchIssueFields = JiraSearchIssue["fields"];

export type JiraBoardIssueFields = JiraBoardIssue["fields"];

export type JiraIssueFields = JiraIssueResponse["fields"];

export type JiraCurrentUser = {
  self: string;
  key: string;
  name: string;
  emailAddress: string;
  avatarUrls: JiraIssueAvatarUrls;
  displayName: string;
  active: boolean;
  deleted: boolean;
  timeZone: string;
  locale: string;
  groups: {
    size: number;
    items: unknown[];
  };
  applicationRoles: {
    size: number;
    items: unknown[];
  };
  expand: string;
};

export type JiraEpic = {
  id: number;
  key: string;
  self: string;
  name: string;
  summary: string;
  color: {
    key: string;
  };
  done: boolean;
};

export type JiraField = {
  id: string;
  name: string;
  custom: boolean;
  orderable: boolean;
  navigable: boolean;
  searchable: boolean;
  clauseNames: string[];
  schema?: {
    type: string;
    system?: string;
    custom?: string;
    customId?: number;
    items?: string;
  };
};
