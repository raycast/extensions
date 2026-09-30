/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** RFC3339 formatted date in the UTC time zone denoted by letter 'Z' */
  DateTime: any;
  /** URL is a String implementing the [URL Standard](http://url.spec.whatwg.org/) */
  Url: any;
};

export type AccessToken = {
  __typename?: "AccessToken";
  accountId?: Maybe<Scalars["ID"]>;
  createdAt: Scalars["DateTime"];
  id: Scalars["ID"];
  name: Scalars["String"];
};

export type AccessTokenConnection = {
  __typename?: "AccessTokenConnection";
  /** A list of edges. */
  edges: Array<AccessTokenEdge>;
  /** A list of nodes. */
  nodes: Array<AccessToken>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

export type AccessTokenCreateInput = {
  accountId?: InputMaybe<Scalars["ID"]>;
  name: Scalars["String"];
};

export type AccessTokenCreatePayload = AccessTokenCreateSuccess | InvalidAccountError | TokenLimitExceededError;

export type AccessTokenCreateSuccess = {
  __typename?: "AccessTokenCreateSuccess";
  jwt: Scalars["String"];
  query: Query;
  token: AccessToken;
};

export type AccessTokenDeleteInput = {
  id: Scalars["ID"];
};

export type AccessTokenDeletePayload = AccessTokenDeleteSuccess | TokenDoesNotExistError;

export type AccessTokenDeleteSuccess = {
  __typename?: "AccessTokenDeleteSuccess";
  deletedId: Scalars["ID"];
  query: Query;
};

/** An edge in a connection. */
export type AccessTokenEdge = {
  __typename?: "AccessTokenEdge";
  /** A cursor for use in pagination */
  cursor: Scalars["String"];
  /** The item at the end of the edge */
  node: AccessToken;
};

export type Account = {
  createdAt: Scalars["DateTime"];
  id: Scalars["ID"];
  name: Scalars["String"];
  projects: ProjectConnection;
  slug: Scalars["String"];
};

export type AccountProjectsArgs = {
  after?: InputMaybe<Scalars["String"]>;
  before?: InputMaybe<Scalars["String"]>;
  first?: InputMaybe<Scalars["Int"]>;
  last?: InputMaybe<Scalars["Int"]>;
};

export type AccountDoesNotExistError = {
  __typename?: "AccountDoesNotExistError";
  query: Query;
};

export type AlreadyMemberError = {
  __typename?: "AlreadyMemberError";
  query: Query;
};

export type Branch = {
  __typename?: "Branch";
  activeDeployment?: Maybe<Deployment>;
  deployments: DeploymentConnection;
  domains: Array<Scalars["String"]>;
  environment: BranchEnvironment;
  id: Scalars["ID"];
  latestDeployment?: Maybe<Deployment>;
  name: Scalars["String"];
  project: Project;
};

export type BranchDeploymentsArgs = {
  after?: InputMaybe<Scalars["String"]>;
  before?: InputMaybe<Scalars["String"]>;
  first?: InputMaybe<Scalars["Int"]>;
  last?: InputMaybe<Scalars["Int"]>;
};

export type BranchConnection = {
  __typename?: "BranchConnection";
  /** A list of edges. */
  edges: Array<BranchEdge>;
  /** A list of nodes. */
  nodes: Array<Branch>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type BranchEdge = {
  __typename?: "BranchEdge";
  /** A cursor for use in pagination */
  cursor: Scalars["String"];
  /** The item at the end of the edge */
  node: Branch;
};

export enum BranchEnvironment {
  Preview = "PREVIEW",
  Production = "PRODUCTION",
}

export type BranchMetricsPayload = BranchMetricsSuccess | ProjectDoesNotExistError;

export type BranchMetricsSuccess = {
  __typename?: "BranchMetricsSuccess";
  latency: Distribution;
  request: Distribution;
};

export type CurrentPlanLimitReachedError = {
  __typename?: "CurrentPlanLimitReachedError";
  max: Scalars["Int"];
  query: Query;
};

export type DatabaseRegion = {
  __typename?: "DatabaseRegion";
  city: Scalars["String"];
  continent: Scalars["String"];
  countryCode: Scalars["String"];
  name: Scalars["String"];
};

export enum DatabaseRegionChangeStatus {
  Completed = "COMPLETED",
  InProgress = "IN_PROGRESS",
}

export type DatabaseUsage = {
  __typename?: "DatabaseUsage";
  dbReads: Distribution;
  dbSize: Distribution;
  dbWrites: Distribution;
  granularity: DatabaseUsageGranularity;
  requestCount: Distribution;
};

export type DatabaseUsageFilter = {
  endDate?: InputMaybe<Scalars["DateTime"]>;
  environment?: InputMaybe<BranchEnvironment>;
  startDate?: InputMaybe<Scalars["DateTime"]>;
};

export enum DatabaseUsageGranularity {
  Daily = "DAILY",
  Hourly = "HOURLY",
  Monthly = "MONTHLY",
  Weekly = "WEEKLY",
}

/** Deployment */
export type Deployment = {
  __typename?: "Deployment";
  branch: Branch;
  commit?: Maybe<GitCommit>;
  createdAt: Scalars["DateTime"];
  diffAgainstLatestProductionDeployment?: Maybe<Scalars["String"]>;
  diffAgainstPreviousBranchDeployment?: Maybe<Scalars["String"]>;
  /** The duration of the deployment in milliseconds. */
  duration?: Maybe<Scalars["Int"]>;
  finishedAt?: Maybe<Scalars["DateTime"]>;
  id: Scalars["ID"];
  logEntries: Array<DeploymentLogEntry>;
  project: Project;
  schema?: Maybe<Scalars["String"]>;
  startedAt?: Maybe<Scalars["DateTime"]>;
  status: DeploymentStatus;
};

export type DeploymentConnection = {
  __typename?: "DeploymentConnection";
  /** A list of edges. */
  edges: Array<DeploymentEdge>;
  /** A list of nodes. */
  nodes: Array<Deployment>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

/** An edge in a connection. */
export type DeploymentEdge = {
  __typename?: "DeploymentEdge";
  /** A cursor for use in pagination */
  cursor: Scalars["String"];
  /** The item at the end of the edge */
  node: Deployment;
};

export type DeploymentFilter = {
  branch?: InputMaybe<Scalars["String"]>;
  statuses?: Array<DeploymentStatus>;
};

export type DeploymentLogEntry = {
  __typename?: "DeploymentLogEntry";
  createdAt: Scalars["DateTime"];
  level: DeploymentLogLevel;
  message: Scalars["String"];
};

export enum DeploymentLogLevel {
  Error = "ERROR",
  Info = "INFO",
}

export enum DeploymentStatus {
  Failed = "FAILED",
  InProgress = "IN_PROGRESS",
  Queued = "QUEUED",
  Succeeded = "SUCCEEDED",
}

export type Distribution = {
  __typename?: "Distribution";
  unit: UnitType;
  values: Array<DistributionValue>;
};

export type DistributionValue = {
  __typename?: "DistributionValue";
  bucket: Scalars["DateTime"];
  value: Scalars["Int"];
};

export type DuplicateDatabaseRegionsError = {
  __typename?: "DuplicateDatabaseRegionsError";
  duplicates: Array<Scalars["String"]>;
  query: Query;
};

export type EmptyDatabaseRegionsError = {
  __typename?: "EmptyDatabaseRegionsError";
  query: Query;
};

export type EnvironmentVariable = {
  __typename?: "EnvironmentVariable";
  branches?: Maybe<Array<Scalars["String"]>>;
  createdAt: Scalars["DateTime"];
  environments: Array<BranchEnvironment>;
  id: Scalars["ID"];
  name: Scalars["String"];
  updatedAt: Scalars["DateTime"];
  value: Scalars["String"];
};

export type EnvironmentVariableConnection = {
  __typename?: "EnvironmentVariableConnection";
  /** A list of edges. */
  edges: Array<EnvironmentVariableEdge>;
  /** A list of nodes. */
  nodes: Array<EnvironmentVariable>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

export type EnvironmentVariableCreateInput = {
  environments: Array<BranchEnvironment>;
  /** Must not be already assigned. */
  name: Scalars["String"];
  projectId: Scalars["ID"];
  value: Scalars["String"];
};

export type EnvironmentVariableCreatePayload =
  | EnvironmentVariableCreateSuccess
  | NameAlreadyExistsError
  | NameContainsInvalidCharactersError
  | NameTooLongError
  | ProjectDoesNotExistError
  | ReservedPrefixError
  | ValueTooLongError;

export type EnvironmentVariableCreateSuccess = {
  __typename?: "EnvironmentVariableCreateSuccess";
  environmentVariable: EnvironmentVariable;
  query: Query;
};

export type EnvironmentVariableDeleteInput = {
  id: Scalars["ID"];
};

export type EnvironmentVariableDeletePayload = EnvironmentVariableDeleteSuccess | EnvironmentVariableDoesNotExistError;

export type EnvironmentVariableDeleteSuccess = {
  __typename?: "EnvironmentVariableDeleteSuccess";
  deletedId: Scalars["ID"];
  query: Query;
};

export type EnvironmentVariableDoesNotExistError = {
  __typename?: "EnvironmentVariableDoesNotExistError";
  query: Query;
};

/** An edge in a connection. */
export type EnvironmentVariableEdge = {
  __typename?: "EnvironmentVariableEdge";
  /** A cursor for use in pagination */
  cursor: Scalars["String"];
  /** The item at the end of the edge */
  node: EnvironmentVariable;
};

export type EnvironmentVariableUpdateInput = {
  environments?: InputMaybe<Array<BranchEnvironment>>;
  id: Scalars["ID"];
  name?: InputMaybe<Scalars["String"]>;
  value?: InputMaybe<Scalars["String"]>;
};

export type EnvironmentVariableUpdatePayload =
  | EnvironmentVariableDoesNotExistError
  | EnvironmentVariableUpdateSuccess
  | NameAlreadyExistsError
  | NameContainsInvalidCharactersError
  | NameTooLongError
  | ReservedPrefixError
  | ValueTooLongError;

export type EnvironmentVariableUpdateSuccess = {
  __typename?: "EnvironmentVariableUpdateSuccess";
  environmentVariable: EnvironmentVariable;
  query: Query;
};

export type GitAccount = {
  __typename?: "GitAccount";
  /** Date when the app was authorized to access this account */
  connectedAt: Scalars["DateTime"];
  id: Scalars["ID"];
  provider: GitProvider;
  slug: Scalars["String"];
  type: GitAccountType;
};

export enum GitAccountType {
  Organization = "ORGANIZATION",
  Personal = "PERSONAL",
}

export type GitAccountsPayload = GitAccountsSuccess | GitHubAuthorizationError;

export type GitAccountsSuccess = {
  __typename?: "GitAccountsSuccess";
  accounts: Array<GitAccount>;
  query: Query;
};

export type GitCommit = {
  __typename?: "GitCommit";
  author?: Maybe<Scalars["String"]>;
  authorAvatarUrl?: Maybe<Scalars["String"]>;
  message: Scalars["String"];
  sha: Scalars["String"];
};

export type GitHubAuthorizationError = {
  __typename?: "GitHubAuthorizationError";
  query: Query;
};

export enum GitProvider {
  Github = "GITHUB",
}

export type GitRepository = {
  __typename?: "GitRepository";
  branches: Array<Scalars["String"]>;
  defaultBranch?: Maybe<Scalars["String"]>;
  id: Scalars["String"];
  owner: Scalars["String"];
  private: Scalars["Boolean"];
  provider: GitProvider;
  slug: Scalars["String"];
  updatedAt: Scalars["DateTime"];
  url: Scalars["String"];
};

export type InvalidAccountError = {
  __typename?: "InvalidAccountError";
  query: Query;
};

export type InvalidDatabaseRegionsError = {
  __typename?: "InvalidDatabaseRegionsError";
  invalid: Array<Scalars["String"]>;
  query: Query;
};

export type Invite = {
  __typename?: "Invite";
  createdAt: Scalars["DateTime"];
  email: Scalars["String"];
  id: Scalars["ID"];
  invitedBy: User;
  lastRenewedAt: Scalars["DateTime"];
  organization: Organization;
  role: MemberRole;
  status: InviteStatus;
};

export type InviteAcceptInput = {
  id: Scalars["ID"];
};

export type InviteAcceptPayload = AlreadyMemberError | InviteAcceptSuccess | InviteDoesNotExistError;

export type InviteAcceptSuccess = {
  __typename?: "InviteAcceptSuccess";
  member: Member;
  query: Query;
};

export type InviteCancelInput = {
  id: Scalars["ID"];
};

export type InviteCancelPayload = InviteCancelSuccess | InviteDoesNotExistError | NotAllowedToCancelInvitesError;

export type InviteCancelSuccess = {
  __typename?: "InviteCancelSuccess";
  id: Scalars["ID"];
  query: Query;
};

export type InviteConnection = {
  __typename?: "InviteConnection";
  /** A list of edges. */
  edges: Array<InviteEdge>;
  /** A list of nodes. */
  nodes: Array<Invite>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

export type InviteDeclineInput = {
  id: Scalars["ID"];
};

export type InviteDeclinePayload = InviteDeclineSuccess | InviteDoesNotExistError;

export type InviteDeclineSuccess = {
  __typename?: "InviteDeclineSuccess";
  id: Scalars["ID"];
  query: Query;
};

export type InviteDoesNotExistError = {
  __typename?: "InviteDoesNotExistError";
  query: Query;
};

/** An edge in a connection. */
export type InviteEdge = {
  __typename?: "InviteEdge";
  /** A cursor for use in pagination */
  cursor: Scalars["String"];
  /** The item at the end of the edge */
  node: Invite;
};

export type InviteSendInput = {
  email: Scalars["String"];
  organizationId: Scalars["ID"];
  role: MemberRole;
};

export type InviteSendPayload = InviteSendSuccess | NotAllowedToSendInvitesError | OrganizationDoesNotExistError;

export type InviteSendSuccess = {
  __typename?: "InviteSendSuccess";
  invite: Invite;
  query: Query;
};

export enum InviteStatus {
  Expired = "EXPIRED",
  Pending = "PENDING",
}

export type KeyDoesNotExistError = {
  __typename?: "KeyDoesNotExistError";
  query: Query;
};

export type KeyLimitExceededError = {
  __typename?: "KeyLimitExceededError";
  query: Query;
};

export type LoginPayload = LoginSuccess | MissingTokenError;

export type LoginSuccess = {
  __typename?: "LoginSuccess";
  isFirstLogin: Scalars["Boolean"];
  query: Query;
  user: User;
};

export type Member = {
  __typename?: "Member";
  account: Account;
  createdAt: Scalars["DateTime"];
  id: Scalars["ID"];
  role: MemberRole;
  user: User;
};

export type MemberConnection = {
  __typename?: "MemberConnection";
  /** A list of edges. */
  edges: Array<MemberEdge>;
  /** A list of nodes. */
  nodes: Array<Member>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

export type MemberDeleteInput = {
  id: Scalars["ID"];
};

export type MemberDeletePayload = {
  __typename?: "MemberDeletePayload";
  deletedMemberId: Scalars["ID"];
  query: Query;
};

/** An edge in a connection. */
export type MemberEdge = {
  __typename?: "MemberEdge";
  /** A cursor for use in pagination */
  cursor: Scalars["String"];
  /** The item at the end of the edge */
  node: Member;
};

export enum MemberRole {
  Member = "MEMBER",
  Owner = "OWNER",
}

export type MemberUpdateInput = {
  id: Scalars["ID"];
  role?: InputMaybe<MemberRole>;
};

export type MemberUpdatePayload = {
  __typename?: "MemberUpdatePayload";
  member: Member;
  query: Query;
};

export type MissingTokenError = {
  __typename?: "MissingTokenError";
  query: Query;
};

export type MonthlyLimits = {
  __typename?: "MonthlyLimits";
  apiRequests?: Maybe<Scalars["Int"]>;
  reads?: Maybe<Scalars["Int"]>;
  size?: Maybe<Scalars["Int"]>;
  writes?: Maybe<Scalars["Int"]>;
};

export type MustLeaveAtLeastOneKeyForEnvironmentError = {
  __typename?: "MustLeaveAtLeastOneKeyForEnvironmentError";
  query: Query;
};

export type Mutation = {
  __typename?: "Mutation";
  /** Create a new access token. */
  accessTokenCreate: AccessTokenCreatePayload;
  /** Delete a given access token. */
  accessTokenDelete: AccessTokenDeletePayload;
  /** Create a new environment variable. */
  environmentVariableCreate: EnvironmentVariableCreatePayload;
  /** Delete an environment variable. */
  environmentVariableDelete: EnvironmentVariableDeletePayload;
  /** Update an environment variable. */
  environmentVariableUpdate: EnvironmentVariableUpdatePayload;
  inviteAccept: InviteAcceptPayload;
  inviteCancel: InviteCancelPayload;
  inviteDecline: InviteDeclinePayload;
  inviteSend: InviteSendPayload;
  login: LoginPayload;
  /** Remove member from an organization */
  memberDelete: MemberDeletePayload;
  /** Update role of an organization member */
  memberUpdate: MemberUpdatePayload;
  /** Create new organization account owned by the current user. Slug must be unique. */
  organizationCreate: OrganizationCreatePayload;
  organizationDelete: OrganizationDeletePayload;
  organizationSlugUpdate: OrganizationSlugUpdatePayload;
  organizationUpdate: OrganizationUpdatePayload;
  personalAccountDelete: PersonalAccountDeletePayload;
  personalAccountSlugUpdate: PersonalAccountSlugUpdatePayload;
  personalAccountUpdate: PersonalAccountUpdatePayload;
  /** Create a new project API key. */
  projectApiKeyCreate: ProjectApiKeyCreatePayload;
  /** Delete a given API key. */
  projectApiKeyDelete: ProjectApiKeyDeletePayload;
  /** Update a given API key with a new name. */
  projectApiKeyUpdate: ProjectApiKeyUpdatePayload;
  /** Create a new project from a GitHub repository. */
  projectCreateFromRepository: ProjectCreateFromRepositoryPayload;
  /** Create a new project from a GitHub repository. */
  projectCreateFromSchema: ProjectCreateFromSchemaPayload;
  /** Create a new project from a template in a newly created GitHub repository. */
  projectCreateFromTemplate: ProjectCreateFromTemplatePayload;
  projectDelete: ProjectDeletePayload;
  projectUpdate: ProjectUpdatePayload;
};

export type MutationAccessTokenCreateArgs = {
  input: AccessTokenCreateInput;
};

export type MutationAccessTokenDeleteArgs = {
  input: AccessTokenDeleteInput;
};

export type MutationEnvironmentVariableCreateArgs = {
  input: EnvironmentVariableCreateInput;
};

export type MutationEnvironmentVariableDeleteArgs = {
  input: EnvironmentVariableDeleteInput;
};

export type MutationEnvironmentVariableUpdateArgs = {
  input: EnvironmentVariableUpdateInput;
};

export type MutationInviteAcceptArgs = {
  input: InviteAcceptInput;
};

export type MutationInviteCancelArgs = {
  input: InviteCancelInput;
};

export type MutationInviteDeclineArgs = {
  input: InviteDeclineInput;
};

export type MutationInviteSendArgs = {
  input: InviteSendInput;
};

export type MutationMemberDeleteArgs = {
  input: MemberDeleteInput;
};

export type MutationMemberUpdateArgs = {
  input: MemberUpdateInput;
};

export type MutationOrganizationCreateArgs = {
  input: OrganizationCreateInput;
};

export type MutationOrganizationDeleteArgs = {
  input: OrganizationDeleteInput;
};

export type MutationOrganizationSlugUpdateArgs = {
  input: OrganizationSlugUpdateInput;
};

export type MutationOrganizationUpdateArgs = {
  input: OrganizationUpdateInput;
};

export type MutationPersonalAccountSlugUpdateArgs = {
  input: PersonalAccountSlugUpdateInput;
};

export type MutationPersonalAccountUpdateArgs = {
  input: PersonalAccountUpdateInput;
};

export type MutationProjectApiKeyCreateArgs = {
  input: ProjectApiKeyCreateInput;
};

export type MutationProjectApiKeyDeleteArgs = {
  input: ProjectApiKeyDeleteInput;
};

export type MutationProjectApiKeyUpdateArgs = {
  input: ProjectApiKeyUpdateInput;
};

export type MutationProjectCreateFromRepositoryArgs = {
  input: ProjectCreateFromRepositoryInput;
};

export type MutationProjectCreateFromSchemaArgs = {
  input: ProjectCreateFromSchemaInput;
};

export type MutationProjectCreateFromTemplateArgs = {
  input: ProjectCreateFromTemplateInput;
};

export type MutationProjectDeleteArgs = {
  input: ProjectDeleteInput;
};

export type MutationProjectUpdateArgs = {
  input: ProjectUpdateInput;
};

export type NameAlreadyExistsError = {
  __typename?: "NameAlreadyExistsError";
  query: Query;
};

export type NameContainsInvalidCharactersError = {
  __typename?: "NameContainsInvalidCharactersError";
  query: Query;
};

export type NameSizeCheckError = {
  __typename?: "NameSizeCheckError";
  maxLength: Scalars["Int"];
  message: Scalars["String"];
  query: Query;
};

export type NameTooLongError = {
  __typename?: "NameTooLongError";
  query: Query;
};

export type NotAllowedToCancelInvitesError = {
  __typename?: "NotAllowedToCancelInvitesError";
  query: Query;
};

export type NotAllowedToDeleteOrganizationError = {
  __typename?: "NotAllowedToDeleteOrganizationError";
  query: Query;
};

export type NotAllowedToSendInvitesError = {
  __typename?: "NotAllowedToSendInvitesError";
  query: Query;
};

export type NotAllowedToSlugUpdateError = {
  __typename?: "NotAllowedToSlugUpdateError";
  query: Query;
};

export type NotAllowedToUpdateOrganizationError = {
  __typename?: "NotAllowedToUpdateOrganizationError";
  query: Query;
};

export type Organization = Account & {
  __typename?: "Organization";
  createdAt: Scalars["DateTime"];
  id: Scalars["ID"];
  invites: InviteConnection;
  members: MemberConnection;
  name: Scalars["String"];
  projects: ProjectConnection;
  slug: Scalars["String"];
};

export type OrganizationInvitesArgs = {
  after?: InputMaybe<Scalars["String"]>;
  before?: InputMaybe<Scalars["String"]>;
  first?: InputMaybe<Scalars["Int"]>;
  last?: InputMaybe<Scalars["Int"]>;
};

export type OrganizationMembersArgs = {
  after?: InputMaybe<Scalars["String"]>;
  before?: InputMaybe<Scalars["String"]>;
  first?: InputMaybe<Scalars["Int"]>;
  last?: InputMaybe<Scalars["Int"]>;
};

export type OrganizationProjectsArgs = {
  after?: InputMaybe<Scalars["String"]>;
  before?: InputMaybe<Scalars["String"]>;
  first?: InputMaybe<Scalars["Int"]>;
  last?: InputMaybe<Scalars["Int"]>;
};

export type OrganizationConnection = {
  __typename?: "OrganizationConnection";
  /** A list of edges. */
  edges: Array<OrganizationEdge>;
  /** A list of nodes. */
  nodes: Array<Organization>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

export type OrganizationCreateInput = {
  name: Scalars["String"];
  slug: Scalars["String"];
};

export type OrganizationCreatePayload =
  | NameSizeCheckError
  | OrganizationCreateSuccess
  | ReservedSlugsCheckError
  | SlugAlreadyExistsError
  | SlugError
  | SlugSizeCheckError;

export type OrganizationCreateSuccess = {
  __typename?: "OrganizationCreateSuccess";
  member: Member;
  organization: Organization;
  query: Query;
};

export type OrganizationDeleteInput = {
  id: Scalars["ID"];
};

export type OrganizationDeletePayload =
  | NotAllowedToDeleteOrganizationError
  | OrganizationDeleteSuccess
  | OrganizationDoesNotExistError;

export type OrganizationDeleteSuccess = {
  __typename?: "OrganizationDeleteSuccess";
  deletedId: Scalars["ID"];
  query: Query;
};

export type OrganizationDoesNotExistError = {
  __typename?: "OrganizationDoesNotExistError";
  query: Query;
};

/** An edge in a connection. */
export type OrganizationEdge = {
  __typename?: "OrganizationEdge";
  /** A cursor for use in pagination */
  cursor: Scalars["String"];
  /** The item at the end of the edge */
  node: Organization;
};

export type OrganizationOwnershipNotTransferredError = {
  __typename?: "OrganizationOwnershipNotTransferredError";
  query: Query;
};

export type OrganizationSlugUpdateInput = {
  id: Scalars["ID"];
  slug: Scalars["String"];
};

export type OrganizationSlugUpdatePayload =
  | NotAllowedToSlugUpdateError
  | OrganizationDoesNotExistError
  | OrganizationSlugUpdateSuccess
  | ReservedSlugsCheckError
  | SlugAlreadyExistsError
  | SlugError
  | SlugSizeCheckError;

export type OrganizationSlugUpdateSuccess = {
  __typename?: "OrganizationSlugUpdateSuccess";
  organization: Organization;
  query: Query;
};

export type OrganizationUpdateInput = {
  id: Scalars["ID"];
  name: Scalars["String"];
};

export type OrganizationUpdatePayload =
  | NameSizeCheckError
  | NotAllowedToUpdateOrganizationError
  | OrganizationDoesNotExistError
  | OrganizationUpdateSuccess;

export type OrganizationUpdateSuccess = {
  __typename?: "OrganizationUpdateSuccess";
  organization: Organization;
  query: Query;
};

/** Information about pagination in a connection */
export type PageInfo = {
  __typename?: "PageInfo";
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars["String"]>;
  /** When paginating forwards, are there more items? */
  hasNextPage: Scalars["Boolean"];
  /** When paginating backwards, are there more items? */
  hasPreviousPage: Scalars["Boolean"];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars["String"]>;
};

export type PersonalAccount = Account & {
  __typename?: "PersonalAccount";
  createdAt: Scalars["DateTime"];
  id: Scalars["ID"];
  name: Scalars["String"];
  projects: ProjectConnection;
  slug: Scalars["String"];
};

export type PersonalAccountProjectsArgs = {
  after?: InputMaybe<Scalars["String"]>;
  before?: InputMaybe<Scalars["String"]>;
  first?: InputMaybe<Scalars["Int"]>;
  last?: InputMaybe<Scalars["Int"]>;
};

export type PersonalAccountDeletePayload = OrganizationOwnershipNotTransferredError | PersonalAccountDeleteSuccess;

export type PersonalAccountDeleteSuccess = {
  __typename?: "PersonalAccountDeleteSuccess";
  deletedId: Scalars["ID"];
  query: Query;
};

export type PersonalAccountSlugUpdateInput = {
  slug: Scalars["String"];
};

export type PersonalAccountSlugUpdatePayload =
  | PersonalAccountSlugUpdateSuccess
  | ReservedSlugsCheckError
  | SlugAlreadyExistsError
  | SlugError
  | SlugSizeCheckError;

export type PersonalAccountSlugUpdateSuccess = {
  __typename?: "PersonalAccountSlugUpdateSuccess";
  query: Query;
};

export type PersonalAccountUpdateInput = {
  name: Scalars["String"];
};

export type PersonalAccountUpdatePayload = NameSizeCheckError | PersonalAccountUpdateSuccess;

export type PersonalAccountUpdateSuccess = {
  __typename?: "PersonalAccountUpdateSuccess";
  query: Query;
};

export type Project = {
  __typename?: "Project";
  apiKeys: ProjectApiKeyConnection;
  branches: BranchConnection;
  createdAt: Scalars["DateTime"];
  databaseRegionChangeStatus: DatabaseRegionChangeStatus;
  databaseRegions: Array<DatabaseRegion>;
  deployments: DeploymentConnection;
  environmentVariables: EnvironmentVariableConnection;
  id: Scalars["ID"];
  plan: ProjectPlan;
  productionBranch: Branch;
  repository?: Maybe<GitRepository>;
  slug: Scalars["String"];
  status: ProjectStatus;
  usage: DatabaseUsage;
};

export type ProjectApiKeysArgs = {
  after?: InputMaybe<Scalars["String"]>;
  before?: InputMaybe<Scalars["String"]>;
  first?: InputMaybe<Scalars["Int"]>;
  last?: InputMaybe<Scalars["Int"]>;
};

export type ProjectBranchesArgs = {
  after?: InputMaybe<Scalars["String"]>;
  before?: InputMaybe<Scalars["String"]>;
  first?: InputMaybe<Scalars["Int"]>;
  last?: InputMaybe<Scalars["Int"]>;
};

export type ProjectDeploymentsArgs = {
  after?: InputMaybe<Scalars["String"]>;
  before?: InputMaybe<Scalars["String"]>;
  filter?: InputMaybe<DeploymentFilter>;
  first?: InputMaybe<Scalars["Int"]>;
  last?: InputMaybe<Scalars["Int"]>;
};

export type ProjectEnvironmentVariablesArgs = {
  after?: InputMaybe<Scalars["String"]>;
  before?: InputMaybe<Scalars["String"]>;
  first?: InputMaybe<Scalars["Int"]>;
  last?: InputMaybe<Scalars["Int"]>;
};

export type ProjectUsageArgs = {
  filter?: InputMaybe<DatabaseUsageFilter>;
};

export type ProjectApiKey = {
  __typename?: "ProjectApiKey";
  createdAt: Scalars["DateTime"];
  environment: BranchEnvironment;
  id: Scalars["ID"];
  key: Scalars["String"];
  name: Scalars["String"];
};

export type ProjectApiKeyConnection = {
  __typename?: "ProjectApiKeyConnection";
  /** A list of edges. */
  edges: Array<ProjectApiKeyEdge>;
  /** A list of nodes. */
  nodes: Array<ProjectApiKey>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

export type ProjectApiKeyCreateInput = {
  environment: BranchEnvironment;
  name: Scalars["String"];
  projectId: Scalars["ID"];
};

export type ProjectApiKeyCreatePayload = KeyLimitExceededError | ProjectApiKeyCreateSuccess | ProjectDoesNotExistError;

export type ProjectApiKeyCreateSuccess = {
  __typename?: "ProjectApiKeyCreateSuccess";
  apiKey: ProjectApiKey;
  query: Query;
};

export type ProjectApiKeyDeleteInput = {
  id: Scalars["ID"];
};

export type ProjectApiKeyDeletePayload =
  | KeyDoesNotExistError
  | MustLeaveAtLeastOneKeyForEnvironmentError
  | ProjectApiKeyDeleteSuccess;

export type ProjectApiKeyDeleteSuccess = {
  __typename?: "ProjectApiKeyDeleteSuccess";
  deletedId: Scalars["ID"];
  query: Query;
};

/** An edge in a connection. */
export type ProjectApiKeyEdge = {
  __typename?: "ProjectApiKeyEdge";
  /** A cursor for use in pagination */
  cursor: Scalars["String"];
  /** The item at the end of the edge */
  node: ProjectApiKey;
};

export type ProjectApiKeyUpdateInput = {
  id: Scalars["ID"];
  name: Scalars["String"];
};

export type ProjectApiKeyUpdatePayload = KeyDoesNotExistError | ProjectApiKeyUpdateSuccess;

export type ProjectApiKeyUpdateSuccess = {
  __typename?: "ProjectApiKeyUpdateSuccess";
  query: Query;
};

export type ProjectConnection = {
  __typename?: "ProjectConnection";
  /** A list of edges. */
  edges: Array<ProjectEdge>;
  /** A list of nodes. */
  nodes: Array<Project>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
};

export type ProjectCreateFromRepositoryInput = {
  accountId: Scalars["ID"];
  databaseRegions?: Array<Scalars["String"]>;
  gitAccountId: Scalars["String"];
  gitRepoUrl: Scalars["Url"];
  productionBranch: Scalars["String"];
  projectSlug: Scalars["String"];
};

export type ProjectCreateFromRepositoryPayload =
  | AccountDoesNotExistError
  | CurrentPlanLimitReachedError
  | DuplicateDatabaseRegionsError
  | EmptyDatabaseRegionsError
  | InvalidDatabaseRegionsError
  | ProjectCreateFromRepositorySuccess
  | RepositoryContainsNoBranchesError
  | SlugAlreadyExistsError
  | SlugInvalidError
  | SlugTooLongError;

export type ProjectCreateFromRepositorySuccess = {
  __typename?: "ProjectCreateFromRepositorySuccess";
  project: Project;
  query: Query;
};

export type ProjectCreateFromSchemaInput = {
  accountId: Scalars["ID"];
  databaseRegions?: Array<Scalars["String"]>;
  projectSlug: Scalars["String"];
  schema: Scalars["String"];
};

export type ProjectCreateFromSchemaPayload =
  | AccountDoesNotExistError
  | CurrentPlanLimitReachedError
  | DuplicateDatabaseRegionsError
  | EmptyDatabaseRegionsError
  | InvalidDatabaseRegionsError
  | ProjectCreateFromSchemaSuccess
  | SlugAlreadyExistsError
  | SlugInvalidError
  | SlugTooLongError;

export type ProjectCreateFromSchemaSuccess = {
  __typename?: "ProjectCreateFromSchemaSuccess";
  project: Project;
  query: Query;
};

export type ProjectCreateFromTemplateInput = {
  accountId: Scalars["ID"];
  databaseRegions?: Array<Scalars["String"]>;
  gitAccountId: Scalars["String"];
  projectSlug: Scalars["String"];
  repoPrivate: Scalars["Boolean"];
  repoSlug: Scalars["String"];
  templateGitUrl: Scalars["Url"];
};

export type ProjectCreateFromTemplatePayload =
  | AccountDoesNotExistError
  | CurrentPlanLimitReachedError
  | DuplicateDatabaseRegionsError
  | EmptyDatabaseRegionsError
  | InvalidDatabaseRegionsError
  | ProjectCreateFromTemplateSuccess
  | RepositorySlugInUseError
  | SlugAlreadyExistsError
  | SlugInvalidError
  | SlugTooLongError
  | TemplateDoesNotExistError;

export type ProjectCreateFromTemplateSuccess = {
  __typename?: "ProjectCreateFromTemplateSuccess";
  project: Project;
  query: Query;
};

export type ProjectDeleteInput = {
  id: Scalars["ID"];
};

export type ProjectDeletePayload = ProjectDeleteSuccess | ProjectDoesNotExistError;

export type ProjectDeleteSuccess = {
  __typename?: "ProjectDeleteSuccess";
  query: Query;
};

export type ProjectDoesNotExistError = {
  __typename?: "ProjectDoesNotExistError";
  query: Query;
};

/** An edge in a connection. */
export type ProjectEdge = {
  __typename?: "ProjectEdge";
  /** A cursor for use in pagination */
  cursor: Scalars["String"];
  /** The item at the end of the edge */
  node: Project;
};

export type ProjectPlan = {
  __typename?: "ProjectPlan";
  monthlyLimits: MonthlyLimits;
  name: Scalars["String"];
};

export enum ProjectStatus {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}

export type ProjectUpdateInput = {
  id: Scalars["ID"];
  productionBranch?: InputMaybe<Scalars["String"]>;
  projectSlug?: InputMaybe<Scalars["String"]>;
};

export type ProjectUpdatePayload =
  | ProjectDoesNotExistError
  | ProjectUpdateSuccess
  | SlugAlreadyExistsError
  | SlugInvalidError
  | SlugTooLongError;

export type ProjectUpdateSuccess = {
  __typename?: "ProjectUpdateSuccess";
  project: Project;
  query: Query;
};

export type Query = {
  __typename?: "Query";
  accessTokens: AccessTokenConnection;
  accountBySlug?: Maybe<Account>;
  /** Get branch by account slug, project slug and the name of the branch. */
  branch?: Maybe<Branch>;
  closestDatabaseRegion?: Maybe<DatabaseRegion>;
  /** Get all database regions available for replication. */
  databaseRegions: Array<DatabaseRegion>;
  /** Get deployment by ID. */
  deployment?: Maybe<Deployment>;
  /** Return a list of git accounts accessible by the current user sorted by the creation date. */
  gitAccounts: GitAccountsPayload;
  /** Returns details about a specific git repository identified by its URL. */
  gitRepoByUrl: GitRepository;
  /**
   * Return a list of git repositories accessible by the current user, sorted by updatedAt.
   * With `query` specified, the list will include up to 10 repos matching the query.
   * Without `query`, the list will include the 10 most recently updated repos.
   */
  gitRepos: Array<GitRepository>;
  invite?: Maybe<Invite>;
  metricsByBranch: BranchMetricsPayload;
  /** Get project by account slug and slug of the project itself. */
  projectByAccountSlug?: Maybe<Project>;
  /** Returns the contents of the `schema.graphql` file located in a particular branch of a repository idenitifed by its URL. */
  schema?: Maybe<Scalars["String"]>;
  /** Give the actual connected user. */
  viewer?: Maybe<User>;
};

export type QueryAccessTokensArgs = {
  after?: InputMaybe<Scalars["String"]>;
  before?: InputMaybe<Scalars["String"]>;
  first?: InputMaybe<Scalars["Int"]>;
  last?: InputMaybe<Scalars["Int"]>;
};

export type QueryAccountBySlugArgs = {
  slug: Scalars["String"];
};

export type QueryBranchArgs = {
  accountSlug: Scalars["String"];
  name: Scalars["String"];
  projectSlug: Scalars["String"];
};

export type QueryDeploymentArgs = {
  id: Scalars["ID"];
};

export type QueryGitAccountsArgs = {
  provider: GitProvider;
};

export type QueryGitRepoByUrlArgs = {
  url: Scalars["Url"];
};

export type QueryGitReposArgs = {
  gitAccountId: Scalars["String"];
  provider: GitProvider;
  query?: InputMaybe<Scalars["String"]>;
};

export type QueryInviteArgs = {
  id: Scalars["ID"];
};

export type QueryMetricsByBranchArgs = {
  accountSlug: Scalars["String"];
  branch: Scalars["String"];
  endDate: Scalars["DateTime"];
  projectSlug: Scalars["String"];
  startDate: Scalars["DateTime"];
};

export type QueryProjectByAccountSlugArgs = {
  accountSlug: Scalars["String"];
  projectSlug: Scalars["String"];
};

export type QuerySchemaArgs = {
  branch: Scalars["String"];
  url: Scalars["Url"];
};

export type RepositoryContainsNoBranchesError = {
  __typename?: "RepositoryContainsNoBranchesError";
  query: Query;
};

export type RepositorySlugInUseError = {
  __typename?: "RepositorySlugInUseError";
  query: Query;
};

export type ReservedPrefixError = {
  __typename?: "ReservedPrefixError";
  query: Query;
};

export type ReservedSlugsCheckError = {
  __typename?: "ReservedSlugsCheckError";
  message: Scalars["String"];
  query: Query;
};

export type SlugAlreadyExistsError = {
  __typename?: "SlugAlreadyExistsError";
  query: Query;
};

export type SlugError = {
  __typename?: "SlugError";
  actual: Scalars["String"];
  expected: Scalars["String"];
  message: Scalars["String"];
  query: Query;
};

export type SlugInvalidError = {
  __typename?: "SlugInvalidError";
  query: Query;
};

export type SlugSizeCheckError = {
  __typename?: "SlugSizeCheckError";
  maxLength: Scalars["Int"];
  message: Scalars["String"];
  query: Query;
};

export type SlugTooLongError = {
  __typename?: "SlugTooLongError";
  maxLength: Scalars["Int"];
  query: Query;
};

export type TemplateDoesNotExistError = {
  __typename?: "TemplateDoesNotExistError";
  query: Query;
};

export type TokenDoesNotExistError = {
  __typename?: "TokenDoesNotExistError";
  query: Query;
};

export type TokenLimitExceededError = {
  __typename?: "TokenLimitExceededError";
  query: Query;
};

export enum UnitType {
  Bytes = "BYTES",
  MilliSeconds = "MILLI_SECONDS",
  NoUnit = "NO_UNIT",
}

export type User = {
  __typename?: "User";
  avatarUrl?: Maybe<Scalars["String"]>;
  createdAt: Scalars["DateTime"];
  email: Scalars["String"];
  id: Scalars["ID"];
  limits: ViewerLimits;
  name: Scalars["String"];
  organizationMemberships: Array<Member>;
  organizations: OrganizationConnection;
  personalAccount?: Maybe<PersonalAccount>;
};

export type UserOrganizationsArgs = {
  after?: InputMaybe<Scalars["String"]>;
  before?: InputMaybe<Scalars["String"]>;
  first?: InputMaybe<Scalars["Int"]>;
  last?: InputMaybe<Scalars["Int"]>;
};

export type ValueTooLongError = {
  __typename?: "ValueTooLongError";
  query: Query;
};

export type ViewerLimits = {
  __typename?: "ViewerLimits";
  remainingProjects?: Maybe<Scalars["Int"]>;
  totalProjects?: Maybe<Scalars["Int"]>;
};

export type GetProjectBranchesQueryVariables = Exact<{
  accountSlug: Scalars["String"];
  projectSlug: Scalars["String"];
}>;

export type GetProjectBranchesQuery = {
  __typename?: "Query";
  projectByAccountSlug?: {
    __typename?: "Project";
    branches: {
      __typename?: "BranchConnection";
      edges: Array<{
        __typename?: "BranchEdge";
        node: {
          __typename?: "Branch";
          id: string;
          name: string;
          activeDeployment?: { __typename?: "Deployment"; createdAt: any } | null;
        };
      }>;
    };
  } | null;
};

export type GetDeploymentsForBranchQueryVariables = Exact<{
  name: Scalars["String"];
  accountSlug: Scalars["String"];
  projectSlug: Scalars["String"];
}>;

export type GetDeploymentsForBranchQuery = {
  __typename?: "Query";
  branch?: {
    __typename?: "Branch";
    deployments: {
      __typename?: "DeploymentConnection";
      edges: Array<{
        __typename?: "DeploymentEdge";
        cursor: string;
        node: {
          __typename?: "Deployment";
          id: string;
          status: DeploymentStatus;
          createdAt: any;
          commit?: {
            __typename?: "GitCommit";
            message: string;
            author?: string | null;
            authorAvatarUrl?: string | null;
          } | null;
        };
      }>;
    };
  } | null;
};

export type GetProjectsByAccountSlugQueryVariables = Exact<{
  slug: Scalars["String"];
}>;

export type GetProjectsByAccountSlugQuery = {
  __typename?: "Query";
  accountBySlug?:
    | {
        __typename?: "Organization";
        projects: {
          __typename?: "ProjectConnection";
          edges: Array<{
            __typename?: "ProjectEdge";
            cursor: string;
            node: {
              __typename?: "Project";
              id: string;
              slug: string;
              repository?: { __typename?: "GitRepository"; url: string } | null;
              productionBranch: {
                __typename?: "Branch";
                name: string;
                domains: Array<string>;
                activeDeployment?: { __typename?: "Deployment"; id: string; createdAt: any } | null;
                latestDeployment?: { __typename?: "Deployment"; id: string; createdAt: any } | null;
              };
            };
          }>;
        };
      }
    | {
        __typename?: "PersonalAccount";
        projects: {
          __typename?: "ProjectConnection";
          edges: Array<{
            __typename?: "ProjectEdge";
            cursor: string;
            node: {
              __typename?: "Project";
              id: string;
              slug: string;
              repository?: { __typename?: "GitRepository"; url: string } | null;
              productionBranch: {
                __typename?: "Branch";
                name: string;
                domains: Array<string>;
                activeDeployment?: { __typename?: "Deployment"; id: string; createdAt: any } | null;
                latestDeployment?: { __typename?: "Deployment"; id: string; createdAt: any } | null;
              };
            };
          }>;
        };
      }
    | null;
};

export type GetScopesQueryVariables = Exact<{ [key: string]: never }>;

export type GetScopesQuery = {
  __typename?: "Query";
  viewer?: {
    __typename?: "User";
    id: string;
    name: string;
    avatarUrl?: string | null;
    personalAccount?: { __typename?: "PersonalAccount"; id: string; name: string; slug: string } | null;
    organizationMemberships: Array<{
      __typename?: "Member";
      account:
        | { __typename?: "Organization"; id: string; slug: string; name: string }
        | { __typename?: "PersonalAccount"; id: string; slug: string; name: string };
    }>;
  } | null;
};

export const GetProjectBranchesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "GetProjectBranches" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "accountSlug" } },
          type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "projectSlug" } },
          type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "projectByAccountSlug" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "accountSlug" },
                value: { kind: "Variable", name: { kind: "Name", value: "accountSlug" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "projectSlug" },
                value: { kind: "Variable", name: { kind: "Name", value: "projectSlug" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "branches" },
                  arguments: [
                    {
                      kind: "Argument",
                      name: { kind: "Name", value: "last" },
                      value: { kind: "IntValue", value: "6" },
                    },
                  ],
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "edges" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "node" },
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  { kind: "Field", name: { kind: "Name", value: "id" } },
                                  { kind: "Field", name: { kind: "Name", value: "name" } },
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "activeDeployment" },
                                    selectionSet: {
                                      kind: "SelectionSet",
                                      selections: [{ kind: "Field", name: { kind: "Name", value: "createdAt" } }],
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetProjectBranchesQuery, GetProjectBranchesQueryVariables>;
export const GetDeploymentsForBranchDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "GetDeploymentsForBranch" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "name" } },
          type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "accountSlug" } },
          type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "projectSlug" } },
          type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "branch" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "name" },
                value: { kind: "Variable", name: { kind: "Name", value: "name" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "accountSlug" },
                value: { kind: "Variable", name: { kind: "Name", value: "accountSlug" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "projectSlug" },
                value: { kind: "Variable", name: { kind: "Name", value: "projectSlug" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "deployments" },
                  arguments: [
                    {
                      kind: "Argument",
                      name: { kind: "Name", value: "last" },
                      value: { kind: "IntValue", value: "6" },
                    },
                  ],
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "edges" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "cursor" } },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "node" },
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  { kind: "Field", name: { kind: "Name", value: "id" } },
                                  { kind: "Field", name: { kind: "Name", value: "status" } },
                                  { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "commit" },
                                    selectionSet: {
                                      kind: "SelectionSet",
                                      selections: [
                                        { kind: "Field", name: { kind: "Name", value: "message" } },
                                        { kind: "Field", name: { kind: "Name", value: "author" } },
                                        { kind: "Field", name: { kind: "Name", value: "authorAvatarUrl" } },
                                      ],
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetDeploymentsForBranchQuery, GetDeploymentsForBranchQueryVariables>;
export const GetProjectsByAccountSlugDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "GetProjectsByAccountSlug" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "slug" } },
          type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "accountBySlug" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "slug" },
                value: { kind: "Variable", name: { kind: "Name", value: "slug" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "projects" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "edges" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "cursor" } },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "node" },
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  { kind: "Field", name: { kind: "Name", value: "id" } },
                                  { kind: "Field", name: { kind: "Name", value: "slug" } },
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "repository" },
                                    selectionSet: {
                                      kind: "SelectionSet",
                                      selections: [{ kind: "Field", name: { kind: "Name", value: "url" } }],
                                    },
                                  },
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "productionBranch" },
                                    selectionSet: {
                                      kind: "SelectionSet",
                                      selections: [
                                        { kind: "Field", name: { kind: "Name", value: "name" } },
                                        { kind: "Field", name: { kind: "Name", value: "domains" } },
                                        {
                                          kind: "Field",
                                          name: { kind: "Name", value: "activeDeployment" },
                                          selectionSet: {
                                            kind: "SelectionSet",
                                            selections: [
                                              { kind: "Field", name: { kind: "Name", value: "id" } },
                                              { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                                            ],
                                          },
                                        },
                                        {
                                          kind: "Field",
                                          name: { kind: "Name", value: "latestDeployment" },
                                          selectionSet: {
                                            kind: "SelectionSet",
                                            selections: [
                                              { kind: "Field", name: { kind: "Name", value: "id" } },
                                              { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                                            ],
                                          },
                                        },
                                      ],
                                    },
                                  },
                                ],
                              },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetProjectsByAccountSlugQuery, GetProjectsByAccountSlugQueryVariables>;
export const GetScopesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "GetScopes" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "viewer" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "avatarUrl" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "personalAccount" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "slug" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "organizationMemberships" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "account" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "id" } },
                            { kind: "Field", name: { kind: "Name", value: "slug" } },
                            { kind: "Field", name: { kind: "Name", value: "name" } },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<GetScopesQuery, GetScopesQueryVariables>;
