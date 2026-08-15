/**
 * Jira Issue Response
 * Excludes all custom fields (fields starting with "customfield_")
 */
export type JiraIssueResponse = {
  /** Expand parameter */
  expand: string;
  /** Issue ID */
  id: string;
  /** Self URL */
  self: string;
  /** Issue key - e.g. `"DEV-123"` */
  key: string;
  /** Field names mapping (optional) */
  names?: Record<string, string>;
  /** Issue fields */
  fields: {
    /** Issue Type */
    issuetype: JiraIssueType;
    /** Parent issue (only for subtasks) */
    parent?: JiraIssueParentIssue;
    /** Time Spent (in seconds) - e.g. `18000` */
    timespent: number | null;
    /** Project */
    project: JiraIssueProject;
    /** Fix Version/s */
    fixVersions: JiraIssueVersion[];
    /** Σ Time Spent (in seconds) - e.g. `18000` */
    aggregatetimespent: number | null;
    /** Resolution */
    resolution: JiraIssueResolution | null;
    /** Resolved - e.g. `"2024-01-01T12:00:00.000+0000"` */
    resolutiondate: string | null;
    /** Work Ratio - e.g. `-1` */
    workratio: number;
    /** Last Viewed - e.g. `"2024-01-01T12:00:00.000+0000"` */
    lastViewed: string | null;
    /** Watchers */
    watches: JiraIssueWatches;
    /** Created - e.g. `"2024-01-01T12:00:00.000+0000"` */
    created: string;
    /** Priority */
    priority: JiraIssuePriority;
    /** Labels - e.g. `[]` or `["bug", "urgent"]` */
    labels: string[];
    /** Remaining Estimate (in seconds) - e.g. `3600` */
    timeestimate: number | null;
    /** Σ Original Estimate (in seconds) - e.g. `7200` */
    aggregatetimeoriginalestimate: number | null;
    /** Affects Version/s */
    versions: JiraIssueVersion[];
    /** Linked Issues */
    issuelinks: JiraIssueLink[];
    /** Assignee */
    assignee: JiraIssueUser | null;
    /** Updated - e.g. `"2024-01-01T12:00:00.000+0000"` */
    updated: string;
    /** Status */
    status: JiraIssueStatus;
    /** Original Estimate (in seconds) - e.g. `7200` */
    timeoriginalestimate: number | null;
    /** Description - e.g. `"# Refactor SSO..."` */
    description: string | null;
    /** Time Tracking */
    timetracking: JiraIssueTimeTracking | Record<string, never>;
    /** Archived - e.g. `"2024-01-01T12:00:00.000+0000"` */
    archiveddate: string | null;
    /** Attachment */
    attachment: JiraIssueAttachment[];
    /** Σ Remaining Estimate (in seconds) - e.g. `3600` */
    aggregatetimeestimate: number | null;
    /** Summary - e.g. `"Website Translation Update"` */
    summary: string;
    /** Creator */
    creator: JiraIssueUser;
    /** Sub-Tasks */
    subtasks: JiraIssueSubtask[];
    /** Reporter */
    reporter: JiraIssueUser;
    /** Σ Progress */
    aggregateprogress: JiraIssueProgress;
    /** Progress */
    progress: JiraIssueProgress;
    /** Comment */
    comment: JiraIssueComments;
    /** Votes */
    votes: JiraIssueVotes;
    /** Log Work */
    worklog: JiraIssueWorklog;
    /** Archiver */
    archivedby: JiraIssueUser | null;
    /** Environment - e.g. `"Production"` */
    environment: string | null;
    /** Due Date - e.g. `"2024-01-01"` */
    duedate: string | null;
    [key: string]: unknown; // custom field
  };
};

/**
 * Jira Issue Avatar URLs
 */
type JiraIssueAvatarUrls = {
  "48x48": string;
  "24x24": string;
  "16x16": string;
  "32x32": string;
};

/**
 * Jira Issue Attachment
 * e.g. `{ "id": "12345", "filename": "test.pdf" }`
 */
type JiraIssueAttachment = {
  self: string;
  id: string;
  filename: string;
  author: JiraIssueUser;
  created: string;
  size: number;
  mimeType: string;
  content: string;
  thumbnail?: string;
};

/**
 * Jira Issue Comment
 */
type JiraIssueComment = {
  self: string;
  id: string;
  author: JiraIssueUser;
  body: string;
  updateAuthor: JiraIssueUser;
  created: string;
  updated: string;
};

/**
 * Jira Issue Comments
 * e.g. `{ "comments": [...], "maxResults": 1, "total": 1, "startAt": 0 }`
 */
type JiraIssueComments = {
  comments: JiraIssueComment[];
  maxResults: number;
  total: number;
  startAt: number;
};

/**
 * Jira Issue Link (simplified for linked issues)
 * e.g. `{ "id": "12345", "type": { "name": "Relates" } }`
 */
type JiraIssueLink = {
  id: string;
  self: string;
  type: JiraIssueLinkType;
  inwardIssue?: {
    id: string;
    key: string;
    self: string;
    fields: {
      summary: string;
      status: JiraIssueStatus;
      priority: JiraIssuePriority;
      issuetype: JiraIssueType;
    };
  };
  outwardIssue?: {
    id: string;
    key: string;
    self: string;
    fields: {
      summary: string;
      status: JiraIssueStatus;
      priority: JiraIssuePriority;
      issuetype: JiraIssueType;
    };
  };
};

/**
 * Jira Issue Link Type
 */
type JiraIssueLinkType = {
  id: string;
  name: string;
  inward: string;
  outward: string;
  self: string;
};

/**
 * Jira Issue Parent Issue (for subtasks)
 * e.g. `{ "id": "12345", "key": "DEV-123" }`
 */
type JiraIssueParentIssue = {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: JiraIssueStatus;
    priority: JiraIssuePriority;
    issuetype: JiraIssueType;
  };
};

/**
 * Jira Issue Priority
 * e.g. `{ "id": "3", "name": "Major" }`
 */
type JiraIssuePriority = {
  self: string;
  iconUrl: string;
  name: string;
  id: string;
};

/**
 * Jira Issue Progress
 * e.g. `{ "progress": 18000, "total": 18000, "percent": 100 }`
 */
type JiraIssueProgress = {
  progress: number;
  total: number;
  percent?: number;
};

/**
 * Jira Issue Project
 * e.g. `{ "id": "10000", "key": "DEV", "name": "Software Development" }`
 */
type JiraIssueProject = {
  self: string;
  id: string;
  key: string;
  name: string;
  projectTypeKey: string;
  avatarUrls: JiraIssueAvatarUrls;
  projectCategory?: {
    self: string;
    id: string;
    name: string;
    description: string;
  };
};

/**
 * Jira Issue Resolution
 * e.g. `{ "id": "10000", "name": "Done" }`
 */
type JiraIssueResolution = {
  self: string;
  id: string;
  description: string;
  name: string;
};

/**
 * Jira Issue Status
 * e.g. `{ "id": "10000", "name": "In Progress" }`
 */
type JiraIssueStatus = {
  self: string;
  description: string;
  iconUrl: string;
  name: string;
  /**
   * Issue Status ID
   */
  id: string;
  statusCategory: {
    self: string;
    id: number;
    key: string;
    colorName: string;
    name: string;
  };
};

/**
 * Jira Issue Subtask (simplified)
 * e.g. `{ "id": "12345", "key": "DEV-123" }`
 */
type JiraIssueSubtask = {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    status: JiraIssueStatus;
    priority: JiraIssuePriority;
    issuetype: JiraIssueType;
  };
};

/**
 * Jira Issue Time Tracking
 * e.g. `{ "timeSpent": "5h", "timeSpentSeconds": 18000 }` or `{}`
 */
type JiraIssueTimeTracking = {
  timeSpent: string;
  timeSpentSeconds: number;
  originalEstimate?: string;
  remainingEstimate?: string;
  originalEstimateSeconds?: number;
  remainingEstimateSeconds?: number;
};

/**
 * Jira Issue Type
 * e.g. `{ "id": "3", "name": "Task", "subtask": false }`
 */
type JiraIssueType = {
  self: string;
  id: string;
  description: string;
  iconUrl: string;
  name: string;
  subtask: boolean;
  avatarId: number;
};

/**
 * Jira Issue User
 * e.g. `{ "name": "frankie", "displayName": "Frankie" }`
 */
type JiraIssueUser = {
  self: string;
  name: string;
  key: string;
  emailAddress: string;
  avatarUrls: JiraIssueAvatarUrls;
  displayName: string;
  active: boolean;
  timeZone: string;
};

/**
 * Jira Issue Version
 * e.g. `{ "id": "10000", "name": "v1.0" }`
 */
type JiraIssueVersion = {
  self: string;
  id: string;
  name: string;
  description?: string;
  archived: boolean;
  released: boolean;
  releaseDate?: string;
  projectId?: number;
  startDate?: string;
  userReleaseDate?: string;
  userStartDate?: string;
};

/**
 * Jira Issue Votes
 * e.g. `{ "votes": 0, "hasVoted": false }`
 */
type JiraIssueVotes = {
  self: string;
  votes: number;
  hasVoted: boolean;
};

/**
 * Jira Issue Watches
 * e.g. `{ "watchCount": 1, "isWatching": true }`
 */
type JiraIssueWatches = {
  self: string;
  watchCount: number;
  isWatching: boolean;
};

/**
 * Jira Issue Worklog Entry
 */
type JiraIssueWorklogEntry = {
  self: string;
  author: JiraIssueUser;
  updateAuthor: JiraIssueUser;
  comment: string;
  created: string;
  updated: string;
  started: string;
  timeSpent: string;
  timeSpentSeconds: number;
  id: string;
  issueId: string;
};

/**
 * Jira Issue Worklog
 * e.g. `{ "startAt": 0, "maxResults": 20, "total": 1, "worklogs": [...] }`
 */
type JiraIssueWorklog = {
  startAt: number;
  maxResults: number;
  total: number;
  worklogs: JiraIssueWorklogEntry[];
};
