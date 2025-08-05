export const GITEE_URL = "https://gitee.com";
export const GET_USER_REPOS = "https://gitee.com/api/v5/user/repos";
export const SEARCH_REPOS = "https://gitee.com/api/v5/search/repositories";
export const USER_ISSUES = "https://gitee.com/api/v5/issues";
export const SEARCH_ISSUES = "https://gitee.com/api/v5/search/issues";
export const GET_REPO_README = (owner: string, repo: string) =>
  `https://gitee.com/api/v5/repos/${owner}/${repo}/readme`;
export const NOTIFICATIONS = "https://gitee.com/api/v5/notifications/threads";

export const PER_PAGE = 20;
export const ISSUE_PER_PAGE = 40;
export const NOTIFICATION_PER_PAGE = 40;

export enum IssueFilter {
  ALL = "all",
  CREATED = "created",
  ASSIGNED = "assigned",
}
export const issueFilter = [
  {
    value: IssueFilter.ALL,
    label: "All",
  },
  {
    value: IssueFilter.CREATED,
    label: "Created",
  },
  {
    value: IssueFilter.ASSIGNED,
    label: "Assigned",
  },
];

export enum NotificationFilter {
  ALL = "all",
  EVENT = "event",
  REFERER = "referer",
}
export const notificationFilter = [
  {
    value: NotificationFilter.ALL,
    label: "All",
  },
  {
    value: NotificationFilter.EVENT,
    label: "Event",
  },
  {
    value: NotificationFilter.REFERER,
    label: "@me",
  },
];
