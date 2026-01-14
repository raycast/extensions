import { environment } from "@raycast/api";

const commandName = environment.commandName;

export const APP_TYPE = {
  CONFLUENCE: "confluence",
  JIRA: "jira",
} as const;

export const CURRENT_APP_TYPE = commandName?.startsWith("jira-") ? APP_TYPE.JIRA : APP_TYPE.CONFLUENCE;

export const COMMAND_NAME = {
  CONFLUENCE_SEARCH_CONTENT: "confluence-search-content",
  CONFLUENCE_SEARCH_USER: "confluence-search-user",
  CONFLUENCE_SEARCH_SPACE: "confluence-search-space",
  JIRA_SEARCH_ISSUE: "jira-search-issue",
  JIRA_MANAGE_FIELD: "jira-manage-field",
  JIRA_WORKLOG_VIEW: "jira-worklog-view",
  JIRA_BOARD_VIEW: "jira-board-view",
  JIRA_NOTIFICATION_VIEW: "jira-notification-view",
} as const;
