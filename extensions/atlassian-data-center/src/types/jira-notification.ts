export type JiraNotificationItem = {
  actionUser: string;
  date: string;
  isApprovalUser: boolean;
  isLoggedOut: boolean;
  showDesktopNotification: boolean;
  notificationType: number;
  isWatching: boolean;
  title: string;
  actionIconUrl: string;
  content: string;
  total: number;
  projectKey: string;
  isFcmEnabled: number;
  action: string;
  longDate: number;
  notificationId: number;
  /**
   * Notification state: 0 = unread, 1 = read
   */
  state: 0 | 1;
  canAddComment: boolean;
  desktopNotificationContent: string;
  summary: string;
  titleWithoutIssueKey: string;
  issueKey: string;
  avatarUrl: string;
  actionUserId: number;
  isIssueBulkAction: boolean;
  contextPath: string;
  count: number;
  unreadNotificationsCount: number;
  userId: string;
  isIssueApproved: boolean;
  stateColor: string;
  isLicenseValid: boolean;
  eventTypeId: number;
  issueUrl: string;
  displayDate: string;
  canManageWatcher: boolean;
  isServiceDeskProject: boolean;
  username: string;
  notificationsChildList?: Array<{
    eventTypeId: number;
    title: string;
    content: string;
  }>;
};

export type JiraNotificationsResponse = {
  notificationsList: JiraNotificationItem[];
  isLicenseValid: boolean;
  total: number;
  userSettings: Record<string, unknown>;
  isLoggedOut: boolean;
  count: number;
  unreadNotificationsCount: number;
  username: string;
};
