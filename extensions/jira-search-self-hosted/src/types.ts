export interface ActiveSprint {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  state: string;
  goal?: string;
  completeDate?: string;
}

// Cache for epic names to avoid multiple fetches
export interface EpicCache {
  [epicKey: string]: string;
}

export interface CustomFieldConfig {
  epicLinkField: string;
  epicNameField: string;
  sprintField: string;
  storyPointsField: string;
}

export interface ActiveSprintResponse {
  values: ActiveSprint[];
}

export interface Board {
  id: number;
  name: string;
  type: string;
}

export interface BoardResponse {
  values: Board[];
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: JiraFields;
}

export interface JiraFields extends Record<string, unknown> {
  summary: string;
  status: {
    name: string;
    statusCategory: {
      name: string;
      colorName: string;
    };
  };
  issuetype: {
    name: string;
    iconUrl: string;
  };
  priority: {
    name: string;
    iconUrl: string;
  };
  assignee?: {
    displayName: string;
    avatarUrls: {
      [key: string]: string;
    };
  };
  timetracking: {
    originalEstimate?: string;
    remainingEstimate?: string;
    originalEstimateSeconds?: number;
    remainingEstimateSeconds?: number;
  };
}

export interface SprintIssuesResponse {
  issues: JiraIssue[];
}
