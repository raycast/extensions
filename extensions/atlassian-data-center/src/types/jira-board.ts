import { JIRA_BOARD_TYPE } from "@/constants";
import type { ValueOf } from "type-fest";
import type {
  JiraIssueUser,
  JiraIssueTimeTracking,
  JiraIssueStatus,
  JiraIssueType,
  JiraIssuePriority,
  JiraEpic,
} from "@/types";

export type JiraBoardType = ValueOf<typeof JIRA_BOARD_TYPE>;

export type JiraBoardIssue = {
  expand: string;
  id: string;
  self: string;
  key: string;
  fields: {
    summary: string;
    issuetype: JiraIssueType;
    duedate: string | null;
    created: string;
    reporter: JiraIssueUser;
    assignee: JiraIssueUser;
    priority: JiraIssuePriority;
    updated: string | null;
    timetracking?: JiraIssueTimeTracking;
    status: JiraIssueStatus;
    epic?: JiraEpic;
    [key: string]: unknown;
  };
};

export type JiraBoardIssuesResponse = {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraBoardIssue[];
  names?: Record<string, string>;
};

export type JiraBoardsResponse = {
  maxResults: number;
  startAt: number;
  total: number;
  isLast: boolean;
  values: Array<{
    id: number;
    self: string;
    name: string;
    type: "scrum" | "kanban";
  }>;
};

export type JiraSprintsResponse = {
  maxResults: number;
  startAt: number;
  isLast: boolean;
  values: Array<{
    id: number;
    self: string;
    state: "future" | "active" | "closed";
    name: string;
    startDate: string;
    endDate: string;
    activatedDate: string;
    originBoardId: number;
    goal: string;
  }>;
};

export type JiraBoardConfiguration = {
  id: number;
  name: string;
  type: "scrum" | "kanban";
  self: string;
  filter: {
    id: string;
    self: string;
  };
  columnConfig: {
    columns: Array<{
      name: string;
      statuses: Array<{
        id: string;
        self: string;
      }>;
    }>;
    constraintType: string;
  };
  estimation: {
    type: string;
    field: {
      fieldId: string;
      displayName: string;
    };
  };
  ranking: {
    rankCustomFieldId: number;
  };
};
