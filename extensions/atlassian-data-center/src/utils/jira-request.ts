import { jiraRequest, handleApiResponse } from "@/utils";
import { JIRA_API } from "@/constants";
import type {
  JiraSearchResponse,
  JiraField,
  JiraIssueProject,
  JiraCurrentUser,
  JiraWorklog,
  JiraWorklogsResponse,
  JiraIssueResponse,
  JiraIssueTransitionsResponse,
  JiraBoardsResponse,
  JiraSprintsResponse,
  JiraBoardConfiguration,
  JiraBoardIssuesResponse,
  JiraWorklogCreateParams,
  JiraWorklogUpdateParams,
  JiraNotificationsResponse,
} from "@/types";

type JiraIssuesByJQLParams = {
  offset: number;
  limit: number;
  jql: string;
  validateQuery?: boolean;
  expand?: string[];
  fields?: string[];
};

export async function getJiraIssuesByJQL({
  offset,
  limit,
  jql,
  validateQuery,
  expand,
  fields,
}: JiraIssuesByJQLParams): Promise<JiraSearchResponse> {
  const params = {
    jql,
    startAt: offset,
    maxResults: limit,
    fields,
    expand,
    validateQuery,
  };
  const data = await jiraRequest<JiraSearchResponse>({ method: "GET", url: JIRA_API.SEARCH, params });

  return handleApiResponse({
    data,
    fileName: "jira-search-issues",
    defaultValue: {
      expand: "schema,names",
      startAt: 0,
      maxResults: 20,
      total: 0,
      issues: [] as JiraSearchResponse["issues"],
      names: {},
    },
  });
}

export async function getJiraFields(): Promise<JiraField[]> {
  const data = await jiraRequest<JiraField[]>({ method: "GET", url: JIRA_API.FIELD });

  return handleApiResponse({
    data,
    fileName: "jira-fields",
    defaultValue: [],
  });
}

export async function getJiraProjects(): Promise<JiraIssueProject[]> {
  const data = await jiraRequest<JiraIssueProject[]>({ method: "GET", url: JIRA_API.PROJECT });

  return handleApiResponse({
    data,
    fileName: "jira-projects",
    defaultValue: [],
  });
}

export async function getJiraCurrentUser(): Promise<JiraCurrentUser | null> {
  const data = await jiraRequest<JiraCurrentUser>({ method: "GET", url: JIRA_API.CURRENT_USER });

  return handleApiResponse({
    data,
    fileName: "jira-current-user",
    defaultValue: null,
  });
}

type JiraWorklogsParams = {
  from: string;
  to: string;
  worker: string[];
};

export async function getJiraWorklogs(params: JiraWorklogsParams): Promise<JiraWorklogsResponse> {
  const data = await jiraRequest<JiraWorklogsResponse>({ method: "POST", url: JIRA_API.WORKLOG_SEARCH, params });

  return handleApiResponse({
    data,
    fileName: "jira-worklogs",
    defaultValue: [],
  });
}

export async function getJiraIssueByKey(url: string): Promise<JiraIssueResponse> {
  const data = await jiraRequest<JiraIssueResponse>({ method: "GET", url });

  return handleApiResponse({
    data,
    fileName: "jira-issue",
    defaultValue: {} as JiraIssueResponse,
  });
}

export async function getJiraIssueTransitions(url: string): Promise<JiraIssueTransitionsResponse> {
  const data = await jiraRequest<JiraIssueTransitionsResponse>({ method: "GET", url });

  return handleApiResponse({
    data,
    fileName: "jira-issue-transitions",
    defaultValue: {
      expand: "transitions",
      transitions: [],
    },
  });
}
/**
 * See: https://developer.atlassian.com/server/jira/platform/rest/v11001/api-group-issue/#api-api-2-issue-issueidorkey-transitions-post
 */
type JiraIssueTransitionParams = {
  transition: {
    id: string;
  };
};

export async function transitionJiraIssue(url: string, params: JiraIssueTransitionParams): Promise<void> {
  await jiraRequest<void>({
    method: "POST",
    url,
    params,
  });
}

export async function getJiraBoards(): Promise<JiraBoardsResponse> {
  const data = await jiraRequest<JiraBoardsResponse>({
    method: "GET",
    url: JIRA_API.BOARD,
    params: { maxResults: 100 },
  });

  return handleApiResponse({
    data,
    fileName: "jira-boards",
    defaultValue: {
      maxResults: 50,
      startAt: 0,
      total: 0,
      isLast: true,
      values: [],
    },
  });
}

type JiraBoardSprintParams = {
  /**
   * Filters results to sprints in specified states. Valid values: future, active, closed. You can define multiple states separated by commas, e.g. state=active,closed
   */
  state?: string;
};

export async function getJiraBoardSprints(url: string, params: JiraBoardSprintParams): Promise<JiraSprintsResponse> {
  const data = await jiraRequest<JiraSprintsResponse>({ method: "GET", url, params });

  return handleApiResponse({
    data,
    fileName: "jira-board-sprints",
    defaultValue: {
      maxResults: 50,
      startAt: 0,
      isLast: true,
      values: [],
    },
  });
}

export async function getJiraBoardConfiguration(url: string): Promise<JiraBoardConfiguration> {
  const data = await jiraRequest<JiraBoardConfiguration>({ method: "GET", url });

  return handleApiResponse({
    data,
    fileName: "jira-board-configuration",
    defaultValue: {
      id: 0,
      name: "",
      type: "scrum",
      self: "",
      filter: { id: "", self: "" },
      columnConfig: { columns: [], constraintType: "none" },
      estimation: { type: "", field: { fieldId: "", displayName: "" } },
      ranking: { rankCustomFieldId: 0 },
    },
  });
}

type JiraIssuesBySprintParams = {
  expand?: string;
  jql?: string;
  maxResults?: number;
  validateQuery?: boolean;
  fields?: string[];
  startAt?: number;
};

export async function getJiraIssuesBySprint(
  url: string,
  params: JiraIssuesBySprintParams,
): Promise<JiraBoardIssuesResponse> {
  const data = await jiraRequest<JiraBoardIssuesResponse>({
    method: "GET",
    url,
    params,
  });

  return handleApiResponse({
    data,
    fileName: "jira-board-sprint-issues",
    defaultValue: {
      expand: "schema,names",
      startAt: 0,
      maxResults: 50,
      total: 0,
      issues: [],
    },
  });
}

type JiraIssuesByBoardParams = {
  offset: number;
  limit: number;
  jql?: string;
  validateQuery?: boolean;
  expand?: string[];
  fields?: string[];
};

export async function getJiraIssuesByBoard(
  url: string,
  { expand, jql, limit, validateQuery, fields, offset }: JiraIssuesByBoardParams,
): Promise<JiraBoardIssuesResponse> {
  const params = {
    startAt: offset,
    maxResults: limit,
    jql,
    validateQuery,
    expand,
    fields,
  };
  const data = await jiraRequest<JiraBoardIssuesResponse>({
    method: "GET",
    url,
    params,
  });

  return handleApiResponse({
    data,
    fileName: "jira-board-issues",
    defaultValue: {
      expand: "schema,names",
      startAt: 0,
      maxResults: 50,
      total: 0,
      issues: [],
      names: {},
    },
  });
}

export async function getJiraWorklogById(worklogId: number): Promise<JiraWorklog> {
  const url = `${JIRA_API.WORKLOG}/${worklogId}`;
  const data = await jiraRequest<JiraWorklog>({ method: "GET", url });

  return handleApiResponse({
    data,
    fileName: "jira-worklog",
    defaultValue: {} as JiraWorklog,
  });
}

export async function createJiraWorklog(params: JiraWorklogCreateParams): Promise<JiraWorklog> {
  const data = await jiraRequest<JiraWorklog>({
    method: "POST",
    url: JIRA_API.WORKLOG,
    params,
  });

  return handleApiResponse({
    data,
    fileName: "jira-worklog-create",
    defaultValue: {} as JiraWorklog,
  });
}

export async function updateJiraWorklog(worklogId: number, params: JiraWorklogUpdateParams): Promise<JiraWorklog> {
  const url = `${JIRA_API.WORKLOG}/${worklogId}/`;
  const data = await jiraRequest<JiraWorklog>({
    method: "PUT",
    url,
    params,
  });

  return handleApiResponse({
    data,
    fileName: "jira-worklog-update",
    defaultValue: {} as JiraWorklog,
  });
}

type JiraNotificationParams = {
  offset: number;
  limit: number;
};

export async function getJiraNotifications({
  offset,
  limit,
}: JiraNotificationParams): Promise<JiraNotificationsResponse> {
  const params = { offSet: offset, limit };
  const data = await jiraRequest<JiraNotificationsResponse>({
    method: "GET",
    url: JIRA_API.NFJ_NOTIFICATION,
    params,
  });

  return handleApiResponse({
    data,
    fileName: "jira-notifications",
    defaultValue: {
      notificationsList: [],
      isLicenseValid: true,
      total: 0,
      userSettings: {},
      isLoggedOut: false,
      count: 0,
      unreadNotificationsCount: 0,
      username: "",
    },
  });
}

export async function markJiraNotificationAsRead(notificationId: number): Promise<void> {
  await jiraRequest<void>({
    method: "POST",
    url: JIRA_API.NFJ_MARK_NOTIFICATIONS_AS_READ,
    params: {
      isRead: 1,
      notificationId,
    },
    acceptHtml: true,
  });
}

export async function markJiraAllNotificationsAsRead(): Promise<void> {
  await jiraRequest<void>({
    method: "POST",
    url: JIRA_API.NFJ_MARK_NOTIFICATIONS_AS_READ,
    params: {},
    acceptHtml: true,
  });
}

export async function setJiraNotificationState(notificationId: number): Promise<void> {
  await jiraRequest<void>({
    method: "POST",
    url: JIRA_API.NFJ_NOTIFICATION_STATE,
    params: {
      state: true,
      notificationId,
    },
    acceptHtml: true,
  });
}

/**
 * Clear the unread notification counter in the UI navigation bar.
 * Note: This only clears the counter display, it does NOT mark any specific notification or all notifications as read.
 */
export async function clearJiraNotificationsCounter(): Promise<void> {
  await jiraRequest<void>({
    method: "POST",
    url: JIRA_API.NFJ_NOTIFICATIONS_COUNTER,
    params: {},
    acceptHtml: true,
  });
}
