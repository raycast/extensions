// Hand-written mirrors of @userplane/contract schemas.
// Field names must stay in sync with packages/contract/src/schemas/*.ts
// so drift is grep-able from the extension side.

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export type WorkspaceRole = "owner" | "admin" | "member";
export type DomainStatus = "pending" | "verified" | "revoked";

export interface WorkspaceMembership {
  workspaceMemberId: string;
  workspaceRole: WorkspaceRole;
  workspaceJoinedAt: string;
}

export interface Workspace {
  workspaceId: string;
  workspaceName: string;
  createdAt: string;
  updatedAt: string;
  workspaceMembership?: WorkspaceMembership;
}

export interface WorkspacesListData {
  workspaces: Workspace[];
  total: number;
  pagination: PaginationMeta;
}

export interface Domain {
  domainId: string;
  domainUrl: string;
  domainStatus: DomainStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DomainsListData {
  workspaceId: string;
  domains: Domain[];
  pagination: PaginationMeta;
}

export interface Project {
  projectId: string;
  projectTitle: string;
  isDefault: boolean;
  recordingRetentionDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsListData {
  workspaceId: string;
  projects: Project[];
  pagination: PaginationMeta;
}

export interface Member {
  workspaceMemberId: string;
  memberName: string;
  memberEmail: string;
  workspaceRole: WorkspaceRole;
}

export interface MembersListData {
  workspaceId: string;
  workspaceMembers: Member[];
  pagination: PaginationMeta;
}

export type LinkType = "file" | "recording" | "session" | "screenshot";

export type LinkProviderType =
  | "intercom"
  | "zendesk"
  | "hubspot"
  | "freshdesk"
  | "freshchat"
  | "jira_service_management"
  | "helpscout"
  | "happyfox"
  | "ada"
  | "forethought"
  | "servicenow"
  | "front"
  | "zoho_desk"
  | "crisp"
  | "pylon"
  | "plain"
  | "asana"
  | "azure_devops"
  | "clickup"
  | "github"
  | "gitlab"
  | "jira"
  | "linear"
  | "notion"
  | "sentry"
  | "slack"
  | "web"
  | "others";

export interface LinkProjectRef {
  projectId: string;
  title: string | null;
}

export interface LinkDomainRef {
  domainId: string;
  url: string;
  status: DomainStatus;
}

export interface LinkCreatorRef {
  workspaceMemberId: string;
  name: string;
}

export interface Link {
  linkId: string;
  linkTitle: string | null;
  linkType: LinkType;
  linkReusable: boolean;
  linkProviderType: LinkProviderType;
  linkProviderId: string | null;
  linkProviderReference: string | null;
  linkURL: string;
  linkMeta: Record<string, string> | null;
  createdAt: string;
  project: LinkProjectRef;
  creator: LinkCreatorRef;
  domain: LinkDomainRef;
}

export interface LinksListData {
  workspaceId: string;
  links: Link[];
  pagination: PaginationMeta;
}

export interface LinkCreateData {
  workspaceId: string;
  link: Link;
}

export interface RecordingCreator {
  workspaceMemberId: string;
  name: string;
}

export interface Recording {
  recordingId: string;
  recordingThumbnail: string | null;
  recordingDurationMs: number | null;
  expiresAt: string | null;
  createdAt: string;
  creator: RecordingCreator;
  linkTitle: string | null;
}

export interface RecordingsListData {
  workspaceId: string;
  recordings: Recording[];
  pagination: PaginationMeta;
}

// UI-only types (no contract equivalent)
export type RecordingSortField = "created_at" | "recording_duration";
export type SortDirection = "asc" | "desc";

export interface RecordingsQuery {
  created_by?: string[];
  project_id?: string[];
  link_id?: string[];
  sort_by?: RecordingSortField;
  sort_direction?: SortDirection;
}

export interface ListRecordingsFilters {
  projectIds: string[];
  linkIds: string[];
  creatorIds: string[];
  sortBy: RecordingSortField;
  sortDirection: SortDirection;
}

export type LinkSortField = "created_at" | "link_title";

export interface LinksQuery {
  created_by?: string[];
  project_id?: string[];
  domain_id?: string[];
  sort_by?: LinkSortField;
  sort_direction?: SortDirection;
}

export interface ListLinksFilters {
  projectIds: string[];
  domainIds: string[];
  creatorIds: string[];
  sortBy: LinkSortField;
  sortDirection: SortDirection;
}

export type SearchType = "members" | "projects" | "domains" | "links";

export interface PublicSearchLink {
  linkId: string;
  linkTitle: string | null;
  linkType: LinkType;
  createdAt: string;
  projectId: string;
  projectTitle: string;
  domainId: string;
  domainUrl: string;
}

export type WorkspaceSearchResult =
  | { type: "members"; results: Member[] }
  | { type: "projects"; results: Project[] }
  | { type: "domains"; results: Domain[] }
  | { type: "links"; results: PublicSearchLink[] };

export interface WorkspaceSearchQuery {
  q: string;
  type: SearchType;
  limit?: number;
}
