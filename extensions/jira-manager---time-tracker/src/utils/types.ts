export interface Preferences {
  jiraDomain: string;
  email?: string;
  apiToken?: string;
  clientId?: string;
  reminderInterval?: string;
}

export interface Issue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    issuetype: {
      name: string;
      iconUrl: string;
    };
    project: {
      id: string;
      key: string;
      name: string;
    };
    assignee?: {
      displayName: string;
      accountId: string;
    };
    status: {
      name: string;
    };
    watches?: {
      isWatching: boolean;
      watchCount: number;
      self: string;
    };
  };
}

export interface Project {
  id: string;
  key: string;
  name: string;
}

export interface IssueType {
  id: string;
  name: string;
  iconUrl: string;
  subtask: boolean;
}

export interface User {
  accountId: string;
  displayName: string;
  emailAddress: string;
}
