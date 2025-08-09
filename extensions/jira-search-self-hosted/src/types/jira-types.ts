export interface Project {
  id: string;
  name: string;
  key: string;
  avatarUrls?: {
    "48x48"?: string;
  };
}

export interface IssueType {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface Priority {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface CreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

export interface JiraUser {
  id?: string;
  accountId?: string;
  name?: string;
  displayName?: string;
  key?: string;
  avatarUrls?: {
    "48x48"?: string;
  };
}

export interface JiraField {
  fieldId: string;
  name: string;
  required: boolean;
  schema?: {
    type?: string;
    custom?: string;
    items?: string;
  };
  allowedValues?: unknown[];
  autoCompleteUrl?: string;
  renderType?: string;
}

export interface FormValues {
  project: string;
  issueType: string;
  summary: string;
  description: string;
  priority: string;
  saveDefaults: boolean;
  dynamicFields: Record<string, unknown>;
  userSearchQueries: Record<string, string>;
}

export interface DefaultSettings {
  project?: string;
  issueType?: string;
  priority?: string;
}
