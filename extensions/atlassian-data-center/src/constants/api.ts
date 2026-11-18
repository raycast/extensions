export const CONFLUENCE_API = {
  SEARCH: "/rest/api/search",
  SEARCH_CONTENT: "/rest/api/content/search",
  CONTENT_FAVOURITE: "/rest/experimental/relation/user/current/favourite/toContent/{contentId}",
  CURRENT_USER: "/rest/api/user/current",
} as const;

export const JIRA_API = {
  SEARCH: "/rest/api/2/search",
  FIELD: "/rest/api/2/field",
  PROJECT: "/rest/api/2/project",
  CURRENT_USER: "/rest/api/2/myself",
  ISSUE: "/rest/api/2/issue/{issueIdOrKey}",
  ISSUE_TRANSITIONS: "/rest/api/2/issue/{issueIdOrKey}/transitions",
  BOARD: "/rest/agile/1.0/board",
  BOARD_ISSUE: "/rest/agile/1.0/board/{boardId}/issue",
  BOARD_SPRINT: "/rest/agile/1.0/board/{boardId}/sprint",
  BOARD_SPRINT_ISSUE: "/rest/agile/1.0/board/{boardId}/sprint/{sprintId}/issue",
  BOARD_CONFIGURATION: "/rest/agile/1.0/board/{boardId}/configuration",
  // Tempo Timesheets
  WORKLOG: "/rest/tempo-timesheets/4/worklogs",
  WORKLOG_SEARCH: "/rest/tempo-timesheets/4/worklogs/search",
  // Notifications for Jira
  NFJ_NOTIFICATION: "/plugins/servlet/nfj/Notification",
  NFJ_NOTIFICATIONS_COUNTER: "/plugins/servlet/nfj/NotificationsCounter",
  NFJ_MARK_NOTIFICATIONS_AS_READ: "/plugins/servlet/nfj/MarkNotificationsAsRead",
  NFJ_NOTIFICATION_STATE: "/plugins/servlet/nfj/NotificationState",
} as const;

export const JIRA_SEARCH_ISSUE_FIELDS = [
  "issuetype",
  "summary",
  "status",
  "priority",
  "assignee",
  "reporter",
  "created",
  "updated",
  "duedate",
  "timetracking",
] as const;

export const JIRA_BOARD_ISSUE_FIELDS = [
  "issuetype",
  "summary",
  "status",
  "priority",
  "assignee",
  "reporter",
  "created",
  "updated",
  "duedate",
  "timetracking",
  "epic",
  // "closedSprints",
] as const;
