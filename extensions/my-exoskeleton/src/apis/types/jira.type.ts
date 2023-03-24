export interface JiraPreference {
  jiraToken: string
  jiraBaseUrl: string
}

export interface JiraIssues {
  issues: Array<JiraIssue>
}

export interface JiraIssue {
  id: string
  key: string
  fields: JiraDetailField
}

export interface JiraDetailField {
  assignee: JiraAssignee
  issuetype: JiraIssueType
  project: Project
  summary: string
  status: JiraStatus
  priority: IssuePriority
  description: string
  labels: Array<string>
  created: string
  attachment: Array<Attachment>
  creator: JiraCreator
}

export interface Project {
  id: string
  key: string
  name: string
}

export interface Attachment {
  id: string
  filename: string
  content: string
  thumbnail: string
}

export interface JiraIssueType {
  iconUrl: string
  name: string
}

export interface JiraStatus {
  name:
    | 'Assign'
    | 'Backlog'
    | 'Dev - To Do'
    | 'Released'
    | 'Dev - Done'
    | 'Ready for Deploy'
    | 'Pending'
    | 'In UAT'
    | 'Testing'
}

export interface JiraAssignee {
  name: string
  displayName: string
  avatarUrls: AvatarUrls
}

export interface JiraCreator {
  name: string
  displayName: string
  avatarUrls: AvatarUrls
}

export interface AvatarUrls {
  '16x16': string
  '24x24': string
  '32x32': string
  '48x48': string
}

export interface IssuePriority {
  name: string
  iconUrl: string
}
