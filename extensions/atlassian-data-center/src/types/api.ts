import { JIRA_SEARCH_ISSUE_FIELDS, JIRA_BOARD_ISSUE_FIELDS } from "@/constants";

export type JiraSearchIssueFieldName = (typeof JIRA_SEARCH_ISSUE_FIELDS)[number];

export type JiraBoardIssueFieldName = (typeof JIRA_BOARD_ISSUE_FIELDS)[number];
