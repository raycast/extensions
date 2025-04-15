import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  BigInt: { input: any; output: any };
  DateTime: { input: any; output: any };
  GitObjectID: { input: any; output: any };
  JSONCString: { input: any; output: any };
  JSONValue: { input: any; output: any };
  PublishedValue: { input: any; output: any };
};

/** Access request status enum */
export enum AccessRequestStatus {
  /** Access request was approved */
  Approved = "APPROVED",
  /** Access request was canceled */
  Canceled = "CANCELED",
  /** Access request is submitted and waiting for actions */
  Pending = "PENDING",
  /** Access request was rejected */
  Rejected = "REJECTED",
}

/** A new external service. */
export type AddExternalServiceInput = {
  /** The JSON configuration of the external service. */
  config: Scalars["String"]["input"];
  /** The display name of the external service. */
  displayName: Scalars["String"]["input"];
  /** The kind of the external service. */
  kind: ExternalServiceKind;
  /**
   * The namespace this external service belongs to.
   * This can be used both for a user and an organization.
   */
  namespace?: InputMaybe<Scalars["ID"]["input"]>;
};

/** Input object for adding insight view to dashboard. */
export type AddInsightViewToDashboardInput = {
  /** ID of the dashboard. */
  dashboardId: Scalars["ID"]["input"];
  /** ID of the insight view to attach to the dashboard */
  insightViewId: Scalars["ID"]["input"];
};

/** The possible types of alerts (Alert.type values). */
export enum AlertType {
  Error = "ERROR",
  Info = "INFO",
  Warning = "WARNING",
}

/** A pre-defined periods to get site analytics. */
export enum AnalyticsDateRange {
  /** Custom date range. */
  Custom = "CUSTOM",
  /** Last month date range. */
  LastMonth = "LAST_MONTH",
  /** Last 3 months date range. */
  LastThreeMonths = "LAST_THREE_MONTHS",
  /** Last week date range. */
  LastWeek = "LAST_WEEK",
}

/** Group site analytics by period. */
export enum AnalyticsGrouping {
  /** Group data by day. */
  Daily = "DAILY",
  /** Group data by week. */
  Weekly = "WEEKLY",
}

/** AssignOwnerOrTeamInput represents the input for assigning or deleting an owner team or person. */
export type AssignOwnerOrTeamInput = {
  /** Path of the file/directory or a root path of the repo, which is assigned for ownership. */
  absolutePath: Scalars["String"]["input"];
  /** ID of an assigned owner or team. */
  assignedOwnerID: Scalars["ID"]["input"];
  /** ID of a repo, which (or which directory/file) is assigned for ownership. */
  repoID: Scalars["ID"]["input"];
};

/** Denotes the type of operation of a given log entry. */
export enum AuditLogOperation {
  /** Denotes this log entry represents an INSERT query. */
  Create = "CREATE",
  /** Denotes this log entry represents an UPDATE query. */
  Modify = "MODIFY",
}

/** BackfillQueueOrderBy enumerates the ways a backfill queue list can be ordered. */
export enum BackfillQueueOrderBy {
  QueuePosition = "QUEUE_POSITION",
  State = "STATE",
}

/** Enum of the possible background routine types */
export enum BackgroundRoutineType {
  /** Custom routine */
  Custom = "CUSTOM",
  /** DB-backed worker */
  DbBacked = "DB_BACKED",
  /** Periodic routine */
  Periodic = "PERIODIC",
  /** Periodic routine with metrics set up */
  PeriodicWithMetrics = "PERIODIC_WITH_METRICS",
}

/** The state of the batch change. */
export enum BatchChangeState {
  Closed = "CLOSED",
  Draft = "DRAFT",
  Open = "OPEN",
}

/** The possible sources of a batch spec. */
export enum BatchSpecSource {
  /** The spec was created from the local src-cli workflow. */
  Local = "LOCAL",
  /**
   * This spec was created for remote server-side execution, e.g. from the web UI editor,
   * or with src batch remote.
   */
  Remote = "REMOTE",
}

/** The possible states of a batch spec. */
export enum BatchSpecState {
  /** The execution has been canceled. */
  Canceled = "CANCELED",
  /** The execution is being canceled. */
  Canceling = "CANCELING",
  /** This spec was processed successfully. */
  Completed = "COMPLETED",
  /** This spec failed to be processed. */
  Failed = "FAILED",
  /** The spec is not yet enqueued for processing. */
  Pending = "PENDING",
  /** This spec is being processed. */
  Processing = "PROCESSING",
  /** This spec is queued to be processed. */
  Queued = "QUEUED",
}

/** State of the workspace resolution. */
export enum BatchSpecWorkspaceResolutionState {
  /** Resolving workspaces finished successfully. */
  Completed = "COMPLETED",
  /** An error occured while resolving workspaces. Will be retried eventually. */
  Errored = "ERRORED",
  /** A fatal error occured while resolving workspaces. No retries will be made. */
  Failed = "FAILED",
  /** Currently resolving workspaces. */
  Processing = "PROCESSING",
  /** Not yet started resolving. Will be picked up by a worker eventually. */
  Queued = "QUEUED",
}

/** The states a workspace can be in. */
export enum BatchSpecWorkspaceState {
  /** Execution has been canceled. */
  Canceled = "CANCELED",
  /** Execution is being canceled. This is an async process. */
  Canceling = "CANCELING",
  /** Execution finished successfully. */
  Completed = "COMPLETED",
  /** A fatal error occured while executing. No retries will be made. */
  Failed = "FAILED",
  /** The workspace is not yet enqueued for execution. */
  Pending = "PENDING",
  /** Currently executing on the workspace. */
  Processing = "PROCESSING",
  /** Not yet started executing. Will be picked up by a worker eventually. */
  Queued = "QUEUED",
  /**
   * The workspace will not be enqueued for execution, because either the
   * workspace is unsupported/ignored or has 0 steps to execute.
   */
  Skipped = "SKIPPED",
}

/** All valid states a bulk operation can be in. */
export enum BulkOperationState {
  /** No operations are still running and all of them finished without error. */
  Completed = "COMPLETED",
  /** No operations are still running and at least one of them finished with an error. */
  Failed = "FAILED",
  /** The bulk operation is still processing on some changesets. */
  Processing = "PROCESSING",
}

/** The available types of jobs that can be run over a batch change. */
export enum BulkOperationType {
  /** Bulk close changesets. */
  Close = "CLOSE",
  /** Bulk post comments over all involved changesets. */
  Comment = "COMMENT",
  /** Bulk detach changesets from a batch change. */
  Detach = "DETACH",
  /** Export changesets. */
  Export = "EXPORT",
  /** Bulk merge changesets. */
  Merge = "MERGE",
  /** Bulk publish changesets. */
  Publish = "PUBLISH",
  /** Bulk reenqueue failed changesets. */
  Reenqueue = "REENQUEUE",
}

/** A status message of a permissions sync job cancellation. */
export enum CancelPermissionsSyncJobResultMessage {
  Error = "ERROR",
  NotFound = "NOT_FOUND",
  Success = "SUCCESS",
}

/** The state of checks (e.g., for continuous integration) on a changeset. */
export enum ChangesetCheckState {
  Failed = "FAILED",
  Passed = "PASSED",
  Pending = "PENDING",
}

/** The state of a changeset on the code host on which it's hosted. */
export enum ChangesetExternalState {
  Closed = "CLOSED",
  Deleted = "DELETED",
  Draft = "DRAFT",
  Merged = "MERGED",
  Open = "OPEN",
  Readonly = "READONLY",
}

/** The publication state of a changeset on Sourcegraph */
export enum ChangesetPublicationState {
  /** The changeset has been created on the code host. */
  Published = "PUBLISHED",
  /** The changeset has not yet been created on the code host. */
  Unpublished = "UNPUBLISHED",
}

/** The reconciler state of a changeset on Sourcegraph */
export enum ChangesetReconcilerState {
  /** The changeset is not enqueued for processing. */
  Completed = "COMPLETED",
  /**
   * The changeset reconciler ran into a problem while processing the
   * changeset and will retry it for a number of retries.
   */
  Errored = "ERRORED",
  /**
   * The changeset reconciler ran into a problem while processing the
   * changeset that can't be fixed by retrying.
   */
  Failed = "FAILED",
  /**
   * The changeset reconciler is currently computing the delta between the
   * If a delta exists, the reconciler tries to update the state of the
   * changeset on the code host and on Sourcegraph to the desired state.
   */
  Processing = "PROCESSING",
  /** The changeset is enqueued for the reconciler to process it. */
  Queued = "QUEUED",
  /** The changeset is scheduled, and will be enqueued when its turn comes in Sourcegraph's rollout window. */
  Scheduled = "SCHEDULED",
}

/** The review state of a changeset. */
export enum ChangesetReviewState {
  Approved = "APPROVED",
  ChangesRequested = "CHANGES_REQUESTED",
  Commented = "COMMENTED",
  Dismissed = "DISMISSED",
  Pending = "PENDING",
}

/** This enum declares all operations supported by the reconciler. */
export enum ChangesetSpecOperation {
  /** The changeset is kept in the batch change, but it's marked as archived. */
  Archive = "ARCHIVE",
  /** Close the changeset on the codehost. */
  Close = "CLOSE",
  /** The changeset is removed from some of the associated batch changes. */
  Detach = "DETACH",
  /** Import an existing changeset from the code host with the ExternalID from the spec. */
  Import = "IMPORT",
  /** Publish a changeset to the codehost. */
  Publish = "PUBLISH",
  /** Publish a changeset to the codehost as a draft changeset. (Only on supported code hosts). */
  PublishDraft = "PUBLISH_DRAFT",
  /** Push a new commit to the code host. */
  Push = "PUSH",
  /** The changeset is re-added to the batch change. */
  Reattach = "REATTACH",
  /** Reopen the changeset on the codehost. */
  Reopen = "REOPEN",
  /** Internal operation to get around slow code host updates. */
  Sleep = "SLEEP",
  /** Sync the changeset with the current state on the codehost. */
  Sync = "SYNC",
  /** Move the existing changeset out of being a draft. */
  Undraft = "UNDRAFT",
  /**
   * Update the existing changeset on the codehost. This is purely the changeset resource on the code host,
   * not the git commit. For updates to the commit, see 'PUSH'.
   */
  Update = "UPDATE",
}

/**
 * A ChangesetSpecPublicationStateInput is a tuple containing a changeset spec ID
 * and its desired UI publication state.
 */
export type ChangesetSpecPublicationStateInput = {
  /** The changeset spec ID. */
  changesetSpec: Scalars["ID"]["input"];
  /** The desired publication state. */
  publicationState: Scalars["PublishedValue"]["input"];
};

/** The type of the changeset spec. */
export enum ChangesetSpecType {
  /** References a branch and a patch to be applied to create the changeset from. */
  Branch = "BRANCH",
  /** References an existing changeset on a code host to be imported. */
  Existing = "EXISTING",
}

/** The visual state a changeset is currently in. */
export enum ChangesetState {
  /** The changeset is published, not being reconciled and closed on the code host. */
  Closed = "CLOSED",
  /** The changeset is published, not being reconciled and has been deleted on the code host. */
  Deleted = "DELETED",
  /** The changeset is published, not being reconciled and in draft state on the code host. */
  Draft = "DRAFT",
  /**
   * The changeset reconciler ran into a problem while processing the
   * changeset that can't be fixed by retrying.
   */
  Failed = "FAILED",
  /** The changeset is published, not being reconciled and merged on the code host. */
  Merged = "MERGED",
  /** The changeset is published, not being reconciled and open on the code host. */
  Open = "OPEN",
  /**
   * The changeset reconciler is currently computing the delta between the
   * If a delta exists, the reconciler tries to update the state of the
   * changeset on the code host and on Sourcegraph to the desired state.
   */
  Processing = "PROCESSING",
  /**
   * The changeset is published, and is now read-only, most likely due to the
   * repository being archived.
   */
  Readonly = "READONLY",
  /**
   * The changeset reconciler ran into a problem while processing the
   * changeset and will retry it for a number of retries.
   */
  Retrying = "RETRYING",
  /** The changeset is scheduled, and will be enqueued when its turn comes in Sourcegraph's rollout window. */
  Scheduled = "SCHEDULED",
  /** The changeset has not been marked as to be published. */
  Unpublished = "UNPUBLISHED",
}

/** The clone status of a repository. */
export enum CloneStatus {
  Cloned = "CLONED",
  Cloning = "CLONING",
  NotCloned = "NOT_CLONED",
}

/** EXPERIMENTAL: This type may change in a backwards-incompatible way. */
export type CodeGraphDataFilter = {
  /**
   * If this field is not set, then the codeGraphData API
   * will go through each provenance each provenance one by one
   * in the order Precise -> Syntactic -> SearchBased
   * and stop when some data is available.
   */
  provenance?: InputMaybe<CodeGraphDataProvenanceComparator>;
};

/** EXPERIMENTAL: This type may change in a backwards-incompatible way. */
export enum CodeGraphDataProvenance {
  /**
   * Based on a compiler, a type-checker or a similar data source
   * which doesn't have false positives.
   * Generally, the results are specific to a particular build configuration,
   * such as for a specific OS or CPU, which can matter for
   * codebases having a large amount of platform-specific code.
   */
  Precise = "PRECISE",
  /**
   * Based on a data source that only does textual analysis, say
   * using regular expressions.
   */
  SearchBased = "SEARCH_BASED",
  /**
   * Based on a data source that uses an abstract or concrete syntax
   * tree, but without access to reliable type information.
   */
  Syntactic = "SYNTACTIC",
}

/** EXPERIMENTAL: This type may change in a backwards-incompatible way. */
export type CodeGraphDataProvenanceComparator = {
  /** Checks for exact equality. */
  equals?: InputMaybe<CodeGraphDataProvenance>;
};

/** Describes the status of a permissions sync for a given provider (code host). */
export enum CodeHostStatus {
  Error = "ERROR",
  Success = "SUCCESS",
}

/** CodeownersFileInput represents the input for ingesting codeowners files */
export type CodeownersFileInput = {
  /** fileContents is the text of the codeowners file */
  fileContents: Scalars["String"]["input"];
  /** The repo ID to ingest the file for. Cannot be set with repositoryName. */
  repoID?: InputMaybe<Scalars["ID"]["input"]>;
  /** The repo name to ingest the file for. Cannot be set with repositoryID. */
  repoName?: InputMaybe<Scalars["String"]["input"]>;
};

/** The version of the Cody context filters. */
export enum CodyContextFiltersVersion {
  /** Rules defining which repositories Cody may use as context in requests to third-party LLMs. */
  V1 = "V1",
}

/** A plan for cody subscription. */
export enum CodySubscriptionPlan {
  Free = "FREE",
  Pro = "PRO",
}

/** A status for cody subscription. */
export enum CodySubscriptionStatus {
  Active = "ACTIVE",
  Canceled = "CANCELED",
  Other = "OTHER",
  PastDue = "PAST_DUE",
  Trialing = "TRIALING",
  Unpaid = "UNPAID",
}

/** Input wrapper for completions */
export type CompletionsInput = {
  /** Maximum number of tokens to sample */
  maxTokensToSample: Scalars["Int"]["input"];
  /** List of conversation messages */
  messages: Array<Message>;
  /** Temperature for sampling - higher means more random completions */
  temperature: Scalars["Float"]["input"];
  /** Number of highest probability completions to return */
  topK: Scalars["Int"]["input"];
  /** Probability threshold for inclusion in results */
  topP: Scalars["Int"]["input"];
};

/**
 * DEPRECATED: This type was renamed to SettingsEdit.
 * NOTE: GraphQL does not support @deprecated directives on INPUT_FIELD_DEFINITION (input fields).
 */
export type ConfigurationEdit = {
  /** DEPRECATED */
  keyPath: Array<KeyPathSegment>;
  /** DEPRECATED */
  value?: InputMaybe<Scalars["JSONValue"]["input"]>;
  /** DEPRECATED */
  valueIsJSONCEncodedString?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** CreateFileBlockInput contains the information necessary to create a file block. */
export type CreateFileBlockInput = {
  /** Path within the repository, e.g. "client/web/file.tsx". */
  filePath: Scalars["String"]["input"];
  /** An optional line range. If omitted, we display the entire file. */
  lineRange?: InputMaybe<CreateFileBlockLineRangeInput>;
  /** Name of the repository, e.g. "github.com/sourcegraph/sourcegraph". */
  repositoryName: Scalars["String"]["input"];
  /**
   * An optional revision, e.g. "pr/feature-1", "a9505a2947d3df53558e8c88ff8bcef390fc4e3e".
   * If omitted, we use the latest revision (HEAD).
   */
  revision?: InputMaybe<Scalars["String"]["input"]>;
};

/** Input to create a line range for a file block. */
export type CreateFileBlockLineRangeInput = {
  /** The last line to fetch (0-indexed, exclusive). */
  endLine: Scalars["Int"]["input"];
  /** The first line to fetch (0-indexed, inclusive). */
  startLine: Scalars["Int"]["input"];
};

/** Input object for creating a new dashboard. */
export type CreateInsightsDashboardInput = {
  /** Permissions to grant to the dashboard. */
  grants: InsightsPermissionGrantsInput;
  /** Dashboard title. */
  title: Scalars["String"]["input"];
};

/**
 * GraphQL does not accept union types as inputs, so we have to use
 * all possible optional inputs with an enum to select the actual block input we want to use.
 */
export type CreateNotebookBlockInput = {
  /** File input. */
  fileInput?: InputMaybe<CreateFileBlockInput>;
  /** ID of the block. */
  id: Scalars["String"]["input"];
  /** Markdown input. */
  markdownInput?: InputMaybe<Scalars["String"]["input"]>;
  /** Query input. */
  queryInput?: InputMaybe<Scalars["String"]["input"]>;
  /** Symbol input. */
  symbolInput?: InputMaybe<CreateSymbolBlockInput>;
  /** Block type. */
  type: NotebookBlockType;
};

/** CreateSymbolBlockInput contains the information necessary to create a symbol block. */
export type CreateSymbolBlockInput = {
  /** Path within the repository, e.g. "client/web/file.tsx". */
  filePath: Scalars["String"]["input"];
  /** Number of lines to show before and after the matched symbol line. */
  lineContext: Scalars["Int"]["input"];
  /** Name of the repository, e.g. "github.com/sourcegraph/sourcegraph". */
  repositoryName: Scalars["String"]["input"];
  /**
   * An optional revision, e.g. "pr/feature-1", "a9505a2947d3df53558e8c88ff8bcef390fc4e3e".
   * If omitted, we use the latest revision (HEAD).
   */
  revision?: InputMaybe<Scalars["String"]["input"]>;
  /** Name of the symbol container. */
  symbolContainerName: Scalars["String"]["input"];
  /** The symbol kind. */
  symbolKind: SymbolKind;
  /** The symbol name. */
  symbolName: Scalars["String"]["input"];
};

/**
 * A repository to pass to the deleteCodeownersFiles mutation. Either repoID or repoName
 * must be provided.
 */
export type DeleteCodeownersFilesInput = {
  /** The repo ID to ingest the file for. Cannot be set with repositoryName. */
  repoID?: InputMaybe<Scalars["ID"]["input"]>;
  /** The repo name to ingest the file for. Cannot be set with repositoryID. */
  repoName?: InputMaybe<Scalars["String"]["input"]>;
};

/** Represents the severity level of a diagnostic. */
export enum DiagnosticSeverity {
  Error = "ERROR",
  Hint = "HINT",
  Information = "INFORMATION",
  Warning = "WARNING",
}

/** The type of content in a hunk line. */
export enum DiffHunkLineType {
  /** Added line. */
  Added = "ADDED",
  /** Deleted line. */
  Deleted = "DELETED",
  /** Unchanged line. */
  Unchanged = "UNCHANGED",
}

/** A description of a user event. */
export type Event = {
  /** The additional argument information. */
  argument?: InputMaybe<Scalars["String"]["input"]>;
  /** The billing ID for the event, used for tagging user events for billing aggregation purposes. */
  billingEventID?: InputMaybe<Scalars["String"]["input"]>;
  /** The product category for the event, used for billing purposes. */
  billingProductCategory?: InputMaybe<Scalars["String"]["input"]>;
  /** The client that this event is being sent from. */
  client?: InputMaybe<Scalars["String"]["input"]>;
  /**
   * An optional cohort ID to identify the user as part of a specific A/B test.
   * The cohort ID is expected to be a date in the form YYYY-MM-DD
   */
  cohortID?: InputMaybe<Scalars["String"]["input"]>;
  /** The site ID that the client was connected to when the event was logged. */
  connectedSiteID?: InputMaybe<Scalars["String"]["input"]>;
  /** Device ID used for Amplitude analytics. Used on Sourcegraph Cloud only. */
  deviceID?: InputMaybe<Scalars["String"]["input"]>;
  /** Device session ID to identify the user's session for analytics. */
  deviceSessionID?: InputMaybe<Scalars["String"]["input"]>;
  /** The name of the event. */
  event: Scalars["String"]["input"];
  /**
   * Event ID used to deduplicate events that occur simultaneously in Amplitude analytics.
   * See https://developers.amplitude.com/docs/http-api-v2#optional-keys. Used on Sourcegraph Cloud only.
   */
  eventID?: InputMaybe<Scalars["Int"]["input"]>;
  /** The first sourcegraph URL visited by the user, stored in a browser cookie. */
  firstSourceURL?: InputMaybe<Scalars["String"]["input"]>;
  /** The connected site's license key, hashed using sha256. Used for uniquely identifying the site. */
  hashedLicenseKey?: InputMaybe<Scalars["String"]["input"]>;
  /**
   * Insert ID used to deduplicate events that re-occur in the event of retries or
   * backfills in Amplitude analytics. See https://developers.amplitude.com/docs/http-api-v2#optional-keys.
   * Used on Sourcegraph Cloud only.
   */
  insertID?: InputMaybe<Scalars["String"]["input"]>;
  /** The last sourcegraph URL visited by the user, stored in a browser cookie. */
  lastSourceURL?: InputMaybe<Scalars["String"]["input"]>;
  /** The original referrer for a user */
  originalReferrer?: InputMaybe<Scalars["String"]["input"]>;
  /**
   * Public argument information. PRIVACY: Do NOT include any potentially private information in this field.
   * These properties get sent to our analytics tools for Cloud, so must not include private information,
   * such as search queries or repository names.
   */
  publicArgument?: InputMaybe<Scalars["String"]["input"]>;
  /**
   * An optional referrer parameter for the user's current session.
   * Only captured and stored on Sourcegraph Cloud.
   */
  referrer?: InputMaybe<Scalars["String"]["input"]>;
  /** The sessions first url for a user */
  sessionFirstURL?: InputMaybe<Scalars["String"]["input"]>;
  /** The session referrer for a user */
  sessionReferrer?: InputMaybe<Scalars["String"]["input"]>;
  /** The source of the event. */
  source: EventSource;
  /** The URL when the event was logged. */
  url: Scalars["String"]["input"];
  /** The randomly generated unique user ID stored in a browser cookie. */
  userCookieID: Scalars["String"]["input"];
};

/** Billing IDs for events, used for tagging user events for billing aggregation purposes. */
export enum EventBillingId {
  /** A billable Cody chat event, including manual chats, recipes, and more. */
  CodyChat = "CodyChat",
  /** A billable Cody completion (aka suggestion or autocomplete) event. */
  CodyCompletion = "CodyCompletion",
  /** A billable Cody embedding/code graph creation or search event. */
  CodyEmbedding = "CodyEmbedding",
}

/** The product categories for events, used for billing purposes. */
export enum EventBillingProductCategory {
  /**
   * Used for all events primarily related to the Code Search product, including file and repo pageviews,
   * search actions, code navigation, batch changes, code insights, etc.
   */
  CodeSearch = "CODE_SEARCH",
  /**
   * Used for all events primarily related to the Cody product, including chats, recipes, completions, web
   * chat views, etc.
   */
  Cody = "CODY",
  /**
   * Used for all events related to non-billable, non-product usage (e.g. marketing, CTAs, signed out
   * events, etc.)
   */
  NotBillable = "NOT_BILLABLE",
  /**
   * Used for all billable but shared user interface events, such as administration, authentication, user
   * profile and settings, shared landing pages, etc.
   */
  Shared = "SHARED",
}

/**
 * The product client where events come from.
 *
 * Future additions include:
 * - BITBUCKET_NATIVE_INTEGRATION
 * - GITLAB_NATIVE_INTEGRATION
 * - CHROME_SOURCEGRAPH_EXTENSION
 * - FIREFOX_SOURCEGRAPH_EXTENSION
 * - EDGE_SOURCEGRAPH_EXTENSION
 * - VSCODE_SOURCEGRAPH_EXTENSION (for https://marketplace.visualstudio.com/items?itemName=sourcegraph.sourcegraph)
 * - EMACS_CODY_EXTENSION
 */
export enum EventClient {
  AppBackend = "APP_BACKEND",
  AppWeb = "APP_WEB",
  DotcomBackend = "DOTCOM_BACKEND",
  DotcomWeb = "DOTCOM_WEB",
  JetbrainsCodyExtension = "JETBRAINS_CODY_EXTENSION",
  MarketingWeb = "MARKETING_WEB",
  NeovimCodyExtension = "NEOVIM_CODY_EXTENSION",
  ServerBackend = "SERVER_BACKEND",
  ServerWeb = "SERVER_WEB",
  VscodeCodyExtension = "VSCODE_CODY_EXTENSION",
}

/** The product sources where events can come from. */
export enum EventSource {
  Backend = "BACKEND",
  Codehostintegration = "CODEHOSTINTEGRATION",
  /** DEPRECATED */
  Cody = "CODY",
  Ideextension = "IDEEXTENSION",
  Staticweb = "STATICWEB",
  Web = "WEB",
}

/** Supported status of monitor events. */
export enum EventStatus {
  Error = "ERROR",
  Pending = "PENDING",
  Success = "SUCCESS",
}

/** The compatibility of the executor with the sourcegraph instance. */
export enum ExecutorCompatibility {
  /** Executor version is more than one version behind the Sourcegraph instance. */
  Outdated = "OUTDATED",
  /** Executor is up-to-date with the Sourcegraph instance. */
  UpToDate = "UP_TO_DATE",
  /** Executor version is more than one version ahead of the Sourcegraph instance. */
  VersionAhead = "VERSION_AHEAD",
}

/** Enum of the possible scopes for executor secrets. */
export enum ExecutorSecretScope {
  /** The secret is meant to be used with Batch Changes execution. */
  Batches = "BATCHES",
  /** The secret is meant to be used with Auto-indexing. */
  Codeintel = "CODEINTEL",
}

/** A specific kind of external service. */
export enum ExternalServiceKind {
  Awscodecommit = "AWSCODECOMMIT",
  Azuredevops = "AZUREDEVOPS",
  Bitbucketcloud = "BITBUCKETCLOUD",
  Bitbucketserver = "BITBUCKETSERVER",
  Gerrit = "GERRIT",
  Github = "GITHUB",
  Gitlab = "GITLAB",
  Gitolite = "GITOLITE",
  Gomodules = "GOMODULES",
  Jvmpackages = "JVMPACKAGES",
  Npmpackages = "NPMPACKAGES",
  Other = "OTHER",
  Pagure = "PAGURE",
  Perforce = "PERFORCE",
  Phabricator = "PHABRICATOR",
  Pythonpackages = "PYTHONPACKAGES",
  Rubypackages = "RUBYPACKAGES",
  Rustpackages = "RUSTPACKAGES",
}

/** The possible states of an external service sync job. */
export enum ExternalServiceSyncJobState {
  /** Sync job has been canceled. */
  Canceled = "CANCELED",
  /** Sync job is being canceled. */
  Canceling = "CANCELING",
  /** Sync finished successfully. */
  Completed = "COMPLETED",
  /** An error occurred while syncing. Will be retried eventually. */
  Errored = "ERRORED",
  /** A fatal error occurred while syncing. No retries will be made. */
  Failed = "FAILED",
  /** Currently syncing. */
  Processing = "PROCESSING",
  /** Not yet started. Will be picked up by a worker eventually. */
  Queued = "QUEUED",
}

/** Additional options when performing a permissions sync. */
export type FetchPermissionsOptions = {
  /**
   * Indicate that any caches added for optimization encountered during this permissions
   * sync should be invalidated.
   */
  invalidateCaches?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** GitHubAppDomain enumerates the domains in which GitHub Apps can be used. */
export enum GitHubAppDomain {
  /** GitHub Apps that are configured for batch changes commit signing. */
  Batches = "BATCHES",
  /** GitHub Apps that are configured for repository syncing. */
  Repos = "REPOS",
}

/** GitHubAppKind enumerates the domains in which GitHub Apps can be used. */
export enum GitHubAppKind {
  /** GitHub Apps that are configured for commit signing. */
  CommitSigning = "COMMIT_SIGNING",
  /** GitHub Apps that are configured for repo syncing. */
  RepoSync = "REPO_SYNC",
  /** GitHub Apps that are configured for a site's batch changes credential. */
  SiteCredential = "SITE_CREDENTIAL",
  /** GitHub Apps that are configured for a user's batch changes credential. */
  UserCredential = "USER_CREDENTIAL",
}

/** All possible types of Git objects. */
export enum GitObjectType {
  /** A Git blob object. */
  GitBlob = "GIT_BLOB",
  /** A Git commit object. */
  GitCommit = "GIT_COMMIT",
  /** A Git tag object. */
  GitTag = "GIT_TAG",
  /** A Git tree object. */
  GitTree = "GIT_TREE",
  /** A Git object of unknown type. */
  GitUnknown = "GIT_UNKNOWN",
}

/** All possible types of Git refs. */
export enum GitRefType {
  /** A Git branch (in refs/heads/). */
  GitBranch = "GIT_BRANCH",
  /** A Git ref that is neither a branch nor tag. */
  GitRefOther = "GIT_REF_OTHER",
  /** A Git tag (in refs/tags/). */
  GitTag = "GIT_TAG",
}

/** Fields that can be grouped on for compute powered insights. */
export enum GroupByField {
  Author = "AUTHOR",
  Date = "DATE",
  Lang = "LANG",
  Path = "PATH",
  Repo = "REPO",
}

/** Input for a happiness feedback submission. */
export type HappinessFeedbackSubmissionInput = {
  /** The path that the happiness feedback will be submitted from. */
  currentPath?: InputMaybe<Scalars["String"]["input"]>;
  /** The feedback text from the user. */
  feedback?: InputMaybe<Scalars["String"]["input"]>;
};

/** A specific highlighted line range to fetch. */
export type HighlightLineRange = {
  /**
   * The last line to fetch (0-indexed, inclusive). Values outside the bounds of the file will
   * automatically be clamped within the valid range.
   */
  endLine: Scalars["Int"]["input"];
  /**
   * The first line to fetch (0-indexed, inclusive). Values outside the bounds of the file will
   * automatically be clamped within the valid range.
   */
  startLine: Scalars["Int"]["input"];
};

/** The format and highlighting to use when requesting highlighting information for a file. */
export enum HighlightResponseFormat {
  /** HTML formatted file content with syntax highlighting. */
  HtmlHighlight = "HTML_HIGHLIGHT",
  /** HTML formatted file content without syntax highlighting. */
  HtmlPlaintext = "HTML_PLAINTEXT",
  /** SCIP highlighting information as JSON. */
  JsonScip = "JSON_SCIP",
}

/** Possible queue states */
export enum InsightQueueItemState {
  Completed = "COMPLETED",
  Failed = "FAILED",
  New = "NEW",
  Processing = "PROCESSING",
  Queued = "QUEUED",
  Unknown = "UNKNOWN",
}

/** Input for the default values for filters and aggregates for an insight. */
export type InsightViewControlsInput = {
  /** Input for the default filters for an insight. */
  filters: InsightViewFiltersInput;
  /** Input for series' sort order. */
  seriesDisplayOptions: SeriesDisplayOptionsInput;
};

/** Input for the default values by which the insight is filtered. */
export type InsightViewFiltersInput = {
  /** A regex string for which to exclude repositories in a filter. */
  excludeRepoRegex?: InputMaybe<Scalars["String"]["input"]>;
  /** A regex string for which to include repositories in a filter. */
  includeRepoRegex?: InputMaybe<Scalars["String"]["input"]>;
  /** A list of query based search contexts to include in the filters for the view. */
  searchContexts?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

/** Input object for permissions to grant. */
export type InsightsPermissionGrantsInput = {
  /** Set global to true to grant global permission. */
  global?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Organizations to grant permissions to. */
  organizations?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  /** Specific users to grant permissions to. */
  users?: InputMaybe<Array<Scalars["ID"]["input"]>>;
};

/**
 * A segment of a key path that locates a nested JSON value in a root JSON value. Exactly one field in each
 * KeyPathSegment must be non-null.
 * For example, in {"a": [0, {"b": 3}]}, the value 3 is located at the key path ["a", 1, "b"].
 */
export type KeyPathSegment = {
  /** The index of the array at this location to descend into. */
  index?: InputMaybe<Scalars["Int"]["input"]>;
  /** The name of the property in the object at this location to descend into. */
  property?: InputMaybe<Scalars["String"]["input"]>;
};

/** Options for a line chart data series */
export type LineChartDataSeriesOptionsInput = {
  /** The label for the data series. */
  label?: InputMaybe<Scalars["String"]["input"]>;
  /** The line color for the data series. */
  lineColor?: InputMaybe<Scalars["String"]["input"]>;
};

/** Options for a line chart */
export type LineChartOptionsInput = {
  /** The chart title. */
  title?: InputMaybe<Scalars["String"]["input"]>;
};

/** Input for a line chart search insight data series. */
export type LineChartSearchInsightDataSeriesInput = {
  /** Whether or not to generate the timeseries results from the query capture groups. Defaults to false if not provided. */
  generatedFromCaptureGroups?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** The field to group results by. (For compute powered insights only.) This field is experimental and should be considered unstable in the API. */
  groupBy?: InputMaybe<GroupByField>;
  /** Options for this line chart data series. */
  options: LineChartDataSeriesOptionsInput;
  /** The query string. */
  query: Scalars["String"]["input"];
  /**
   * The scope of repositories. The repository scope can be provided at the LineChartSearchInsightInput level.
   * If scope is provided here will take priority of any other scope provide at a higher level in the input.
   */
  repositoryScope?: InputMaybe<RepositoryScopeInput>;
  /** Unique ID for the series. Omit this field if it's a new series. */
  seriesId?: InputMaybe<Scalars["String"]["input"]>;
  /**
   * The scope of time. This time scope can also be provided at the LineChartSearchInsightInput level.
   * If the scope is provided here it will take priority over any other scope provided at a higher level in the input.
   */
  timeScope?: InputMaybe<TimeScopeInput>;
};

/** Input for a line chart search insight. */
export type LineChartSearchInsightInput = {
  /** The dashboard IDs to associate this insight with once created. */
  dashboards?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  /** The list of data series to create (or add) to this insight. */
  dataSeries: Array<LineChartSearchInsightDataSeriesInput>;
  /** The options for this line chart. */
  options: LineChartOptionsInput;
  /** The scope of repositories for the insight. If provided here it will apply to all series unless overwritten. */
  repositoryScope?: InputMaybe<RepositoryScopeInput>;
  /** The scope of time for the insight view. If provided here it will apply to all series unless overwritten. */
  timeScope?: InputMaybe<TimeScopeInput>;
  /** The default values for filters and aggregates for this line chart. */
  viewControls?: InputMaybe<InsightViewControlsInput>;
};

/** Describes options for rendering Markdown. */
export type MarkdownOptions = {
  /** A dummy null value (empty input types are not allowed yet). */
  alwaysNil?: InputMaybe<Scalars["String"]["input"]>;
};

/** Message to or from the LLM */
export type Message = {
  /** Speaker of the message (human/assistant) */
  speaker: SpeakerType;
  /** Text content of the message */
  text: Scalars["String"]["input"];
};

/** The input required to create an action. */
export type MonitorActionInput = {
  /** An email action. */
  email?: InputMaybe<MonitorEmailInput>;
  /** A Slack webhook action. */
  slackWebhook?: InputMaybe<MonitorSlackWebhookInput>;
  /** A webhook action. */
  webhook?: InputMaybe<MonitorWebhookInput>;
};

/** The input required to edit an action. */
export type MonitorEditActionInput = {
  /** An email action. */
  email?: InputMaybe<MonitorEditEmailInput>;
  /** A Slack webhook action. */
  slackWebhook?: InputMaybe<MonitorEditSlackWebhookInput>;
  /** A webhook action. */
  webhook?: InputMaybe<MonitorEditWebhookInput>;
};

/** The input required to edit an email action. */
export type MonitorEditEmailInput = {
  /**
   * The id of an email action. If unset, this will
   * be treated as a new email action and be created
   * rather than updated.
   */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** The desired state after the update. */
  update: MonitorEmailInput;
};

/** The input required to edit a code monitor. */
export type MonitorEditInput = {
  /** The id of the monitor. */
  id: Scalars["ID"]["input"];
  /** The desired state after the udpate. */
  update: MonitorInput;
};

/** The input required to edit a Slack webhook action. */
export type MonitorEditSlackWebhookInput = {
  /**
   * The id of a Slack webhook action. If unset, this will
   * be treated as a new Slack webhook action and be created
   * rather than updated.
   */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** The desired state after the update. */
  update: MonitorSlackWebhookInput;
};

/** The input required to edit a trigger. */
export type MonitorEditTriggerInput = {
  /** The id of the Trigger. */
  id: Scalars["ID"]["input"];
  /** The desired state after the udpate. */
  update: MonitorTriggerInput;
};

/** The input required to edit a webhook action. */
export type MonitorEditWebhookInput = {
  /**
   * The id of a webhook action. If unset, this will
   * be treated as a new webhook action and be created
   * rather than updated.
   */
  id?: InputMaybe<Scalars["ID"]["input"]>;
  /** The desired state after the update. */
  update: MonitorWebhookInput;
};

/** The input required to create an email action. */
export type MonitorEmailInput = {
  /** Whether the email action is enabled or not. */
  enabled: Scalars["Boolean"]["input"];
  /** Use header to automatically approve the message in a read-only or moderated mailing list. */
  header: Scalars["String"]["input"];
  /** Whether to include the result contents in the email message */
  includeResults: Scalars["Boolean"]["input"];
  /** The priority of the email. */
  priority: MonitorEmailPriority;
  /** A list of users or orgs which will receive the email. */
  recipients: Array<Scalars["ID"]["input"]>;
};

/** The priority of an email action. */
export enum MonitorEmailPriority {
  Critical = "CRITICAL",
  Normal = "NORMAL",
}

/** The input required to create a code monitor. */
export type MonitorInput = {
  /** A meaningful description of the code monitor. */
  description: Scalars["String"]["input"];
  /** Whether the code monitor is enabled or not. */
  enabled: Scalars["Boolean"]["input"];
  /**
   * The namespace represents the owner of the code monitor.
   * Owners can either be users or organizations.
   */
  namespace: Scalars["ID"]["input"];
};

/** The input required to create a Slack webhook action. */
export type MonitorSlackWebhookInput = {
  /** Whether the Slack webhook action is enabled or not. */
  enabled: Scalars["Boolean"]["input"];
  /** Whether to include the result contents in Slack notification message. */
  includeResults: Scalars["Boolean"]["input"];
  /** The URL that will receive a payload when the action is triggered. */
  url: Scalars["String"]["input"];
};

/** The input required to create a trigger. */
export type MonitorTriggerInput = {
  /** The query string. */
  query: Scalars["String"]["input"];
};

/** The input required to create a webhook action. */
export type MonitorWebhookInput = {
  /** Whether the webhook action is enabled or not. */
  enabled: Scalars["Boolean"]["input"];
  /** Whether to include the result contents in webhook payload. */
  includeResults: Scalars["Boolean"]["input"];
  /** The URL that will receive a payload when the action is triggered. */
  url: Scalars["String"]["input"];
};

/** An enum to describe the reasons why search aggregations are not available */
export enum NotAvailableReasonType {
  InvalidAggregationModeForQuery = "INVALID_AGGREGATION_MODE_FOR_QUERY",
  InvalidQuery = "INVALID_QUERY",
  OtherError = "OTHER_ERROR",
  TimeoutExtensionAvailable = "TIMEOUT_EXTENSION_AVAILABLE",
  TimeoutNoExtensionAvailable = "TIMEOUT_NO_EXTENSION_AVAILABLE",
}

/** Enum of possible block types. */
export enum NotebookBlockType {
  File = "FILE",
  Markdown = "MARKDOWN",
  Query = "QUERY",
  Symbol = "SYMBOL",
}

/** Input for a new notebook. */
export type NotebookInput = {
  /** Array of notebook blocks. */
  blocks: Array<CreateNotebookBlockInput>;
  /**
   * Notebook namespace (user or org). Controls the visibility of the notebook
   * and who can edit the notebook. Only the notebook creator can update the namespace.
   */
  namespace: Scalars["ID"]["input"];
  /**
   * Public property controls the visibility of the notebook. A public notebook is available to
   * any user on the instance. Private notebooks are only available to their creators.
   */
  public: Scalars["Boolean"]["input"];
  /** The title of the notebook. */
  title: Scalars["String"]["input"];
};

/** NotebooksOrderBy enumerates the ways notebooks can be ordered. */
export enum NotebooksOrderBy {
  NotebookCreatedAt = "NOTEBOOK_CREATED_AT",
  NotebookStarCount = "NOTEBOOK_STAR_COUNT",
  NotebookUpdatedAt = "NOTEBOOK_UPDATED_AT",
}

/** The recipient's possible responses to an invitation to join an organization as a member. */
export enum OrganizationInvitationResponseType {
  /** The invitation was accepted by the recipient. */
  Accept = "ACCEPT",
  /** The invitation was rejected by the recipient. */
  Reject = "REJECT",
}

/** Input for the createOutboundWebhook mutation. */
export type OutboundWebhookCreateInput = {
  /**
   * The event types the outbound webhook will receive.
   *
   * At least one event type must be provided.
   */
  eventTypes: Array<OutboundWebhookScopedEventTypeInput>;
  /** The secret shared with the outbound webhook. */
  secret: Scalars["String"]["input"];
  /** The outbound webhook URL. */
  url: Scalars["String"]["input"];
};

/** Event type input for the outbound webhook mutations. */
export type OutboundWebhookScopedEventTypeInput = {
  /**
   * The event type, which must match a key returned from
   * outboundWebhookEventTypes.
   */
  eventType: Scalars["String"]["input"];
  /**
   * An optional scope for the event type.
   *
   * Currently unused.
   */
  scope?: InputMaybe<Scalars["String"]["input"]>;
};

/** Input for the updateOutboundWebhook mutation. */
export type OutboundWebhookUpdateInput = {
  /**
   * The event types the outbound webhook will receive. This list replaces the
   * event types previously registered on the webhook.
   *
   * At least one event type must be provided.
   */
  eventTypes: Array<OutboundWebhookScopedEventTypeInput>;
  /** The outbound webhook URL. */
  url: Scalars["String"]["input"];
};

/** OwnSignalConfigurationUpdate represents an update to an OwnSignalConfiguration. */
export type OwnSignalConfigurationUpdate = {
  /** Whether or not the signal configuration should be enabled. */
  enabled: Scalars["Boolean"]["input"];
  /** A list of repository name patterns to exclude from the signal. */
  excludedRepoPatterns: Array<Scalars["String"]["input"]>;
  /** The new name for the signal configuration. */
  name: Scalars["String"]["input"];
};

/** The only way we can recognize ownership at this point is through CODEOWNERS file entry. */
export enum OwnershipReasonType {
  AssignedOwner = "ASSIGNED_OWNER",
  CodeownersFileEntry = "CODEOWNERS_FILE_ENTRY",
  RecentContributorOwnershipSignal = "RECENT_CONTRIBUTOR_OWNERSHIP_SIGNAL",
  RecentViewOwnershipSignal = "RECENT_VIEW_OWNERSHIP_SIGNAL",
}

/** Whether a package repo reference filter is part of the allowlist or blocklist */
export enum PackageMatchBehaviour {
  /** Allows a package repo reference to be synced. */
  Allow = "ALLOW",
  /** Blocks a package repo reference from syncing. */
  Block = "BLOCK",
}

/** A package repo reference filter that matches names. */
export type PackageNameFilterInput = {
  /** Glob string to match names. */
  packageGlob: Scalars["String"]["input"];
};

/**
 * A kind of package repo reference.
 * ExternalServiceKind, with a more specific set of values.
 */
export enum PackageRepoReferenceKind {
  Gomodules = "GOMODULES",
  Jvmpackages = "JVMPACKAGES",
  Npmpackages = "NPMPACKAGES",
  Pythonpackages = "PYTHONPACKAGES",
  Rubypackages = "RUBYPACKAGES",
  Rustpackages = "RUSTPACKAGES",
}

/** A package repo reference filter that matches versions for a specific name. */
export type PackageVersionFilterInput = {
  /** Exact package name to match. */
  packageName: Scalars["String"]["input"];
  /** Glob string to match versions. */
  versionGlob: Scalars["String"]["input"];
};

/** A name or version matching filter for. One of either nameFilter or versionFilter must be provided. */
export type PackageVersionOrNameFilterInput = {
  /** Optional name-matching filter. */
  nameFilter?: InputMaybe<PackageNameFilterInput>;
  /** Optional package-specific version-matching filter. */
  versionFilter?: InputMaybe<PackageVersionFilterInput>;
};

/**
 * A namespace represents a distinct context within which permission policies
 * are defined and enforced.
 */
export enum PermissionNamespace {
  /** This represents the Batch Changes namespace. */
  BatchChanges = "BATCH_CHANGES",
  /** This represents the Cody namespace. */
  Cody = "CODY",
  /** Permissions related to exported telemetry. */
  ExportedTelemetry = "EXPORTED_TELEMETRY",
  /**
   * Code ownership namespace used for permitting to assign ownership
   * within Sourcegraph.
   */
  Ownership = "OWNERSHIP",
  /** ❗ Product subscriptions are only available in Sourcegraph.com */
  ProductSubscriptions = "PRODUCT_SUBSCRIPTIONS",
  /**
   * Repo Metadata namespace used for permitting to edit repository
   * key-value pair metadata.
   */
  RepoMetadata = "REPO_METADATA",
  /** Permissions related to workspace repo administration. */
  WorkspaceRepositories = "WORKSPACE_REPOSITORIES",
}

/**
 * PermissionSource indicates where a permission originated from.
 *
 * REPO_SYNC: The permission was synced from the code host, via repo-centric permission sync.
 * USER_SYNC: The permission was synced from the code host using user-centric permission sync.
 * API: The permission was set explicitly via the GraphQL API.
 */
export enum PermissionSource {
  Api = "API",
  RepoSync = "REPO_SYNC",
  UserSync = "USER_SYNC",
}

/** Permission sync job priority. */
export enum PermissionsSyncJobPriority {
  High = "HIGH",
  Low = "LOW",
  Medium = "MEDIUM",
}

/** State types of permission sync jobs. */
export enum PermissionsSyncJobReason {
  ReasonExternalAccountAdded = "REASON_EXTERNAL_ACCOUNT_ADDED",
  ReasonExternalAccountDeleted = "REASON_EXTERNAL_ACCOUNT_DELETED",
  ReasonGithubOrgMemberAddedEvent = "REASON_GITHUB_ORG_MEMBER_ADDED_EVENT",
  ReasonGithubOrgMemberRemovedEvent = "REASON_GITHUB_ORG_MEMBER_REMOVED_EVENT",
  ReasonGithubRepoEvent = "REASON_GITHUB_REPO_EVENT",
  ReasonGithubRepoMadePrivateEvent = "REASON_GITHUB_REPO_MADE_PRIVATE_EVENT",
  ReasonGithubTeamAddedToRepoEvent = "REASON_GITHUB_TEAM_ADDED_TO_REPO_EVENT",
  ReasonGithubTeamRemovedFromRepoEvent = "REASON_GITHUB_TEAM_REMOVED_FROM_REPO_EVENT",
  ReasonGithubUserAddedEvent = "REASON_GITHUB_USER_ADDED_EVENT",
  ReasonGithubUserEvent = "REASON_GITHUB_USER_EVENT",
  ReasonGithubUserMembershipAddedEvent = "REASON_GITHUB_USER_MEMBERSHIP_ADDED_EVENT",
  ReasonGithubUserMembershipRemovedEvent = "REASON_GITHUB_USER_MEMBERSHIP_REMOVED_EVENT",
  ReasonGithubUserRemovedEvent = "REASON_GITHUB_USER_REMOVED_EVENT",
  ReasonManualRepoSync = "REASON_MANUAL_REPO_SYNC",
  ReasonManualUserSync = "REASON_MANUAL_USER_SYNC",
  ReasonRepoNoPerms = "REASON_REPO_NO_PERMS",
  ReasonRepoOutdatedPerms = "REASON_REPO_OUTDATED_PERMS",
  ReasonRepoUpdatedFromCodeHost = "REASON_REPO_UPDATED_FROM_CODE_HOST",
  ReasonUserAcceptedOrgInvite = "REASON_USER_ACCEPTED_ORG_INVITE",
  ReasonUserAdded = "REASON_USER_ADDED",
  ReasonUserAddedToOrg = "REASON_USER_ADDED_TO_ORG",
  ReasonUserEmailRemoved = "REASON_USER_EMAIL_REMOVED",
  ReasonUserEmailVerified = "REASON_USER_EMAIL_VERIFIED",
  ReasonUserNoPerms = "REASON_USER_NO_PERMS",
  ReasonUserOutdatedPerms = "REASON_USER_OUTDATED_PERMS",
  ReasonUserRemovedFromOrg = "REASON_USER_REMOVED_FROM_ORG",
}

/** Sync reason groups of permission sync jobs. */
export enum PermissionsSyncJobReasonGroup {
  Manual = "MANUAL",
  Schedule = "SCHEDULE",
  Sourcegraph = "SOURCEGRAPH",
  Unknown = "UNKNOWN",
  Webhook = "WEBHOOK",
}

/** State types of permissions sync jobs. */
export enum PermissionsSyncJobState {
  Canceled = "CANCELED",
  Completed = "COMPLETED",
  Errored = "ERRORED",
  Failed = "FAILED",
  Processing = "PROCESSING",
  Queued = "QUEUED",
}

/** Type of search for permissions sync jobs: user or repository. */
export enum PermissionsSyncJobsSearchType {
  Repository = "REPOSITORY",
  User = "USER",
}

/** Options for a pie chart */
export type PieChartOptionsInput = {
  /**
   * The threshold for which groups fall into the "other category". Only categories with a percentage greater than
   * this value will be separately rendered.
   */
  otherThreshold: Scalars["Float"]["input"];
  /** The title for the pie chart. */
  title: Scalars["String"]["input"];
};

/** Input for a pie chart search insight */
export type PieChartSearchInsightInput = {
  /** The dashboard IDs to associate this insight with once created. */
  dashboards?: InputMaybe<Array<Scalars["ID"]["input"]>>;
  /** Options for this pie chart. */
  presentationOptions: PieChartOptionsInput;
  /** The query string. */
  query: Scalars["String"]["input"];
  /** The scope of repositories. */
  repositoryScope: RepositoryScopeInput;
};

/**
 * Analogous to Position but as an input type.
 *
 * EXPERIMENTAL: This type may make backwards-incompatible changes in the future.
 */
export type PositionInput = {
  /** Zero-based UTF-16 code unit offset from preceding newline (\n or \r\n) character. */
  character: Scalars["Int"]["input"];
  /** Zero-based count of newline (\n or \r\n) characters before this position. */
  line: Scalars["Int"]["input"];
};

/**
 * Possible states for PreciseIndexes.
 *
 * This type would more accurately be called "CodeGraphIndexJobState"
 * as it covers both precise and syntactic indexing.
 *
 * See https://sourcegraph.com/docs/code-search/code-navigation/auto_indexing#lifecycle-of-an-indexing-job
 * and https://sourcegraph.com/docs/code-search/code-navigation/explanations/uploads#lifecycle-of-an-upload
 * for details about state transitions.
 */
export enum PreciseIndexState {
  Completed = "COMPLETED",
  Deleted = "DELETED",
  Deleting = "DELETING",
  Indexing = "INDEXING",
  IndexingCompleted = "INDEXING_COMPLETED",
  IndexingErrored = "INDEXING_ERRORED",
  Processing = "PROCESSING",
  ProcessingErrored = "PROCESSING_ERRORED",
  QueuedForIndexing = "QUEUED_FOR_INDEXING",
  QueuedForProcessing = "QUEUED_FOR_PROCESSING",
  UploadingIndex = "UPLOADING_INDEX",
}

/** The input that describes a prompt template to create. */
export type PromptInput = {
  /** Whether the prompt should be automatically executed in one click. */
  autoSubmit: Scalars["Boolean"]["input"];
  /** The prompt template definition. */
  definitionText: Scalars["String"]["input"];
  /** The description of the prompt. */
  description: Scalars["String"]["input"];
  /** Whether the prompt is a draft. */
  draft: Scalars["Boolean"]["input"];
  /** Whether to execute prompt as chat, edit or insert command. */
  mode: PromptMode;
  /** The name of the prompt. */
  name: Scalars["String"]["input"];
  /** The owner of the prompt, either a user or organization. */
  owner: Scalars["ID"]["input"];
  /** Whether the prompt is recommended. */
  recommended?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** The visibility state for the prompt. */
  visibility: PromptVisibility;
};

/** The mode in which to execute a prompt. */
export enum PromptMode {
  /** Execute the prompt in chat mode. */
  Chat = "CHAT",
  /** Execute the prompt in edit mode. */
  Edit = "EDIT",
  /** Execute the prompt in insert mode. */
  Insert = "INSERT",
}

/** The input that describes an edit to a prompt template. */
export type PromptUpdateInput = {
  /** Whether the prompt should be automatically executed in one click. */
  autoSubmit: Scalars["Boolean"]["input"];
  /** The prompt template definition. */
  definitionText: Scalars["String"]["input"];
  /** The description of the prompt. */
  description: Scalars["String"]["input"];
  /** Whether the prompt is a draft. */
  draft: Scalars["Boolean"]["input"];
  /** Whether to execute prompt as chat, edit or insert command. */
  mode: PromptMode;
  /** The name of the prompt. */
  name: Scalars["String"]["input"];
  /** Whether the prompt is recommended. */
  recommended?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** The visibility states for a prompt. */
export enum PromptVisibility {
  /** The prompt is visible to all users on the instance. */
  Public = "PUBLIC",
  /**
   * The prompt is visible only to the owner organization's members (if the owner is an organization)
   * or the owner user (if the owner is a user).
   */
  Secret = "SECRET",
}

/** The ways that a list of prompts can be ordered. */
export enum PromptsOrderBy {
  PromptNameWithOwner = "PROMPT_NAME_WITH_OWNER",
  PromptRecommended = "PROMPT_RECOMMENDED",
  PromptUpdatedAt = "PROMPT_UPDATED_AT",
}

/**
 * A range inside a particular blob, describing a usage of a symbol,
 * which can be used to locate other usages of the same symbol.
 *
 * The range must be an *exact match*.
 *
 * In general, a single range may correspond to multiple symbols.
 * A caller can further drill down on a specific symbol using SymbolComparator.
 *
 * EXPERIMENTAL: This type may make backwards-incompatible changes in the future.
 */
export type RangeInput = {
  /** End position of the range (exclusive) */
  end: PositionInput;
  /** The path containing the initial usage for the symbol. */
  path: Scalars["String"]["input"];
  /** The repository containing the initial usage for a symbol. */
  repository: Scalars["String"]["input"];
  /**
   * The revision containing the initial usage for the symbol.
   *
   * Defaults to HEAD of the default branch if not specified.
   */
  revision?: InputMaybe<Scalars["String"]["input"]>;
  /** Start position of the range (inclusive) */
  start: PositionInput;
};

/** Input object for adding insight view to dashboard. */
export type RemoveInsightViewFromDashboardInput = {
  /** ID of the dashboard. */
  dashboardId: Scalars["ID"]["input"];
  /** ID of the insight view to remove from the dashboard */
  insightViewId: Scalars["ID"]["input"];
};

/** State types of repo embedding sync jobs. */
export enum RepoEmbeddingJobState {
  Canceled = "CANCELED",
  Completed = "COMPLETED",
  Errored = "ERRORED",
  Failed = "FAILED",
  Processing = "PROCESSING",
  Queued = "QUEUED",
}

/** EXPERIMENTAL: This type may make backwards-incompatible changes in the future. */
export type RepositoryFilter = {
  /** Compare the repository by name. */
  name: StringComparator;
};

/** RepositoryOrderBy enumerates the ways a repositories list can be ordered. */
export enum RepositoryOrderBy {
  /** deprecated (use the equivalent REPOSITORY_CREATED_AT) */
  RepositoryCreatedAt = "REPOSITORY_CREATED_AT",
  RepositoryName = "REPOSITORY_NAME",
  RepoCreatedAt = "REPO_CREATED_AT",
  Size = "SIZE",
}

/** Different repository permission levels. */
export enum RepositoryPermission {
  Read = "READ",
}

/** A custom repository scope for an insight data series. */
export type RepositoryScopeInput = {
  /** The list of repositories included in this scope. */
  repositories: Array<Scalars["String"]["input"]>;
  /** A search query to select repositories for this scope. */
  repositoryCriteria?: InputMaybe<Scalars["String"]["input"]>;
};

/**
 * All possible types of currently supported repositories, even though they may be stored
 * as a git repository on disk.
 */
export enum RepositoryType {
  GitRepository = "GIT_REPOSITORY",
  PerforceDepot = "PERFORCE_DEPOT",
}

/** Input for saving a new view on an insight. */
export type SaveInsightAsNewViewInput = {
  /** The dashboard ID to associate this insight with once created. */
  dashboard?: InputMaybe<Scalars["ID"]["input"]>;
  /** The insight view ID we are creating a new view from. */
  insightViewId: Scalars["ID"]["input"];
  /** The options for this line chart. */
  options: LineChartOptionsInput;
  /** The default values for filters and aggregates for this line chart. */
  viewControls?: InputMaybe<InsightViewControlsInput>;
};

/** The input that describes a saved search. */
export type SavedSearchInput = {
  /** A description of the saved search. */
  description: Scalars["String"]["input"];
  /** Whether the saved search is a draft. */
  draft: Scalars["Boolean"]["input"];
  /** The owner of the saved search, either a user or organization. */
  owner: Scalars["ID"]["input"];
  /** The search query. */
  query: Scalars["String"]["input"];
  /** The visibility state for the saved search. */
  visibility: SavedSearchVisibility;
};

/** The input that describes a saved search. */
export type SavedSearchUpdateInput = {
  /** A description of the saved search. */
  description: Scalars["String"]["input"];
  /** Whether the saved search is a draft. */
  draft: Scalars["Boolean"]["input"];
  /** The search query. */
  query: Scalars["String"]["input"];
};

/** The visibility states for a saved search. */
export enum SavedSearchVisibility {
  /** The saved search is visible to all users on the instance. */
  Public = "PUBLIC",
  /**
   * The saved search is visible only to the owner organization's members (if the owner is an organization)
   * or the owner user (if the owner is a user).
   */
  Secret = "SECRET",
}

/** The ways that a list of saved searches can be ordered. */
export enum SavedSearchesOrderBy {
  SavedSearchDescription = "SAVED_SEARCH_DESCRIPTION",
  SavedSearchUpdatedAt = "SAVED_SEARCH_UPDATED_AT",
}

/** Supported aggregation modes for search aggregations */
export enum SearchAggregationMode {
  Author = "AUTHOR",
  CaptureGroup = "CAPTURE_GROUP",
  Path = "PATH",
  Repo = "REPO",
  RepoMetadata = "REPO_METADATA",
}

/** Input for editing an existing search context. */
export type SearchContextEditInput = {
  /** Search context description. */
  description: Scalars["String"]["input"];
  /**
   * Search context name. Not the same as the search context spec. Search context namespace and search context name
   * are used to construct the fully-qualified search context spec.
   * Example mappings from search context spec to search context name: global -> global, @user -> user, @org -> org,
   * @user/ctx1 -> ctx1, @org/ctxs/ctx -> ctxs/ctx.
   */
  name: Scalars["String"]["input"];
  /**
   * Public property controls the visibility of the search context. Public search context is available to
   * any user on the instance. If a public search context contains private repositories, those are filtered out
   * for unauthorized users. Private search contexts are only available to their owners. Private user search context
   * is available only to the user, private org search context is available only to the members of the org, and private
   * instance-level search contexts are available only to site-admins.
   */
  public: Scalars["Boolean"]["input"];
  /**
   * Sourcegraph search query that defines the search context.
   * e.g. "r:^github\.com/org (rev:bar or rev:HEAD) file:^sub/dir"
   */
  query: Scalars["String"]["input"];
};

/** Input for a new search context. */
export type SearchContextInput = {
  /** Search context description. */
  description: Scalars["String"]["input"];
  /**
   * Search context name. Not the same as the search context spec. Search context namespace and search context name
   * are used to construct the fully-qualified search context spec.
   * Example mappings from search context spec to search context name: global -> global, @user -> user, @org -> org,
   * @user/ctx1 -> ctx1, @org/ctxs/ctx -> ctxs/ctx.
   */
  name: Scalars["String"]["input"];
  /** Namespace of the search context (user or org). If not set, search context is considered instance-level. */
  namespace?: InputMaybe<Scalars["ID"]["input"]>;
  /**
   * Public property controls the visibility of the search context. Public search context is available to
   * any user on the instance. If a public search context contains private repositories, those are filtered out
   * for unauthorized users. Private search contexts are only available to their owners. Private user search context
   * is available only to the user, private org search context is available only to the members of the org, and private
   * instance-level search contexts are available only to site-admins.
   */
  public: Scalars["Boolean"]["input"];
  /**
   * Sourcegraph search query that defines the search context.
   * e.g. "r:^github\.com/org (rev:bar or rev:HEAD) file:^sub/dir"
   */
  query: Scalars["String"]["input"];
};

/** Input for a set of revisions to be searched within a repository. */
export type SearchContextRepositoryRevisionsInput = {
  /** ID of the repository to be searched. */
  repositoryID: Scalars["ID"]["input"];
  /** Revisions in the repository to be searched. */
  revisions: Array<Scalars["String"]["input"]>;
};

/** SearchContextsOrderBy enumerates the ways a search contexts list can be ordered. */
export enum SearchContextsOrderBy {
  SearchContextSpec = "SEARCH_CONTEXT_SPEC",
  SearchContextUpdatedAt = "SEARCH_CONTEXT_UPDATED_AT",
}

/** Required input to generate a time series for a search insight using live preview. */
export type SearchInsightLivePreviewInput = {
  /** Whether or not to generate the timeseries results from the query capture groups. */
  generatedFromCaptureGroups: Scalars["Boolean"]["input"];
  /** Use this field to specify a compute insight. Note: this is experimental and should be considered unstable */
  groupBy?: InputMaybe<GroupByField>;
  /** The desired label for the series. Will be overwritten when series are dynamically generated. */
  label: Scalars["String"]["input"];
  /** The query string. */
  query: Scalars["String"]["input"];
  /** The scope of repositories. */
  repositoryScope: RepositoryScopeInput;
  /** The scope of time. */
  timeScope: TimeScopeInput;
};

/** Required input to generate a live preview for an insight. */
export type SearchInsightPreviewInput = {
  /** The scope of repositories. */
  repositoryScope: RepositoryScopeInput;
  /** The series to generate previews for */
  series: Array<SearchSeriesPreviewInput>;
  /** The scope of time. */
  timeScope: TimeScopeInput;
};

/** The state of a search job. */
export enum SearchJobState {
  /** The search job was canceled. */
  Canceled = "CANCELED",
  /** The search job has completed. */
  Completed = "COMPLETED",
  /** The search job had an error. */
  Errored = "ERRORED",
  /** The search job has failed. */
  Failed = "FAILED",
  /** The search job is being processed. */
  Processing = "PROCESSING",
  /** The search job has been created and is waiting to be processed. */
  Queued = "QUEUED",
}

/** The order by which search jobs are sorted. */
export enum SearchJobsOrderBy {
  /** Sort search jobs by their creation date. */
  CreatedAt = "CREATED_AT",
  /** Sort search jobs by their query. */
  Query = "QUERY",
  /** Sort search jobs by their state. */
  State = "STATE",
}

/** The search pattern type. */
export enum SearchPatternType {
  Codycontext = "codycontext",
  Keyword = "keyword",
  Literal = "literal",
  Lucky = "lucky",
  Nls = "nls",
  Regexp = "regexp",
  Standard = "standard",
  Structural = "structural",
}

/** The output format to emit for a parsed query. */
export enum SearchQueryOutputFormat {
  /** JSON format. */
  Json = "JSON",
  /** Mermaid flowchart format. */
  Mermaid = "MERMAID",
  /** S-expression format. */
  Sexp = "SEXP",
}

/**
 * Represents phases in query parsing. The parse tree corresponds closely to the
 * input query syntax. A subsequent processing phase on the parse tree generates a
 * job tree. The job tree is an internal representation analogous to a database
 * query plan. The job tree discards information about query syntax and corresponds
 * closely to backend services (text search, git commit search, etc.).
 */
export enum SearchQueryOutputPhase {
  JobTree = "JOB_TREE",
  ParseTree = "PARSE_TREE",
}

/** The output format to emit for a parsed query. */
export enum SearchQueryOutputVerbosity {
  /** Basic verbosity outputs nodes and essential fields associated with nodes. */
  Basic = "BASIC",
  /** Maximal verbosity outputs nodes and all information associated with nodes. */
  Maximal = "MAXIMAL",
  /** Minimal verbosity outputs only nodes. */
  Minimal = "MINIMAL",
}

/** Required input to generate a live preview for a series. */
export type SearchSeriesPreviewInput = {
  /** Whether or not to generate the timeseries results from the query capture groups. */
  generatedFromCaptureGroups: Scalars["Boolean"]["input"];
  /** Use this field to specify a compute insight. Note: this is experimental and should be considered unstable */
  groupBy?: InputMaybe<GroupByField>;
  /** The desired label for the series. Will be overwritten when series are dynamically generated. */
  label: Scalars["String"]["input"];
  /** The query string. */
  query: Scalars["String"]["input"];
};

/** The version of the search syntax. */
export enum SearchVersion {
  /** Search syntax that defaults to regexp search. */
  V1 = "V1",
  /** Search syntax that defaults to literal-only search. */
  V2 = "V2",
  /** Search syntax that defaults to standard search. */
  V3 = "V3",
}

/** Input type for series display options. */
export type SeriesDisplayOptionsInput = {
  /** Max number of series to return. */
  limit?: InputMaybe<Scalars["Int"]["input"]>;
  /** Max number of samples to return. */
  numSamples?: InputMaybe<Scalars["Int"]["input"]>;
  /** Sort options for the series. */
  sortOptions?: InputMaybe<SeriesSortOptionsInput>;
};

/** Sort direction for series. */
export enum SeriesSortDirection {
  Asc = "ASC",
  Desc = "DESC",
}

/** Sort mode for series. */
export enum SeriesSortMode {
  DateAdded = "DATE_ADDED",
  Lexicographical = "LEXICOGRAPHICAL",
  ResultCount = "RESULT_COUNT",
}

/** Input type for series sort options. */
export type SeriesSortOptionsInput = {
  /** Sort direction for series. */
  direction: SeriesSortDirection;
  /** Sort mode for series. */
  mode: SeriesSortMode;
};

/** An edit to a JSON property in a settings JSON object. The JSON property to edit can be nested. */
export type SettingsEdit = {
  /**
   * The key path of the property to update.
   *
   * Inserting into an existing array is not yet supported.
   */
  keyPath: Array<KeyPathSegment>;
  /**
   * The new JSON-encoded value to insert. If the field's value is not set, the property is removed. (This is
   * different from the field's value being the JSON null value.)
   *
   * When the value is a non-primitive type, it must be specified using a GraphQL variable, not an inline literal,
   * or else the GraphQL parser will return an error.
   */
  value?: InputMaybe<Scalars["JSONValue"]["input"]>;
  /**
   * Whether to treat the value as a JSONC-encoded string, which makes it possible to perform an edit that
   * preserves (or adds/removes) comments.
   */
  valueIsJSONCEncodedString?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/**
 * Input for Mutation.settingsMutation, which contains fields that all settings (global, organization, and user
 * settings) mutations need.
 */
export type SettingsMutationGroupInput = {
  /**
   * The ID of the last-known settings known to the client, or null if there is none. This field is used to
   * prevent race conditions when there are concurrent editors.
   */
  lastID?: InputMaybe<Scalars["Int"]["input"]>;
  /** The subject whose settings to mutate (organization, user, etc.). */
  subject: Scalars["ID"]["input"];
};

/** SiteUserOrderBy enumerates the ways a users list can be ordered. */
export enum SiteUserOrderBy {
  /** The datetime when user was added to the system. */
  CreatedAt = "CREATED_AT",
  /** The datetime when user was soft deleted. */
  DeletedAt = "DELETED_AT",
  /** User's primary email. */
  Email = "EMAIL",
  /** The total number of user's event_logs. */
  EventsCount = "EVENTS_COUNT",
  /** The last event_log datetime. */
  LastActiveAt = "LAST_ACTIVE_AT",
  /** Whether the user is site admin or not. */
  SiteAdmin = "SITE_ADMIN",
  Username = "USERNAME",
}

/** SiteUsersDateRangeInput argument to filter based on date range or date equals to null */
export type SiteUsersDateRangeInput = {
  /** Equal to Null */
  empty?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Greater than or equal to */
  gte?: InputMaybe<Scalars["DateTime"]["input"]>;
  /** Less than or equal to */
  lte?: InputMaybe<Scalars["DateTime"]["input"]>;
  /** Negation */
  not?: InputMaybe<Scalars["Boolean"]["input"]>;
};

/** SiteUsersNumberRangeInput argument to filter based on the number range */
export type SiteUsersNumberRangeInput = {
  /** Less than or equal to */
  gte?: InputMaybe<Scalars["Float"]["input"]>;
  /** Greater than or equal to */
  lte?: InputMaybe<Scalars["Float"]["input"]>;
};

/** Speaker type, human or assistant */
export enum SpeakerType {
  Assistant = "ASSISTANT",
  Human = "HUMAN",
}

/** EXPERIMENTAL: This type may make backwards-incompatible changes in the future. */
export type StringComparator = {
  /** Checks for exact equality. */
  equals?: InputMaybe<Scalars["String"]["input"]>;
};

/** EXPERIMENTAL: This type may make backwards-incompatible changes in the future. */
export type SurroundingLines = {
  /** The number of lines after the current line to include. */
  linesAfter?: InputMaybe<Scalars["Int"]["input"]>;
  /** The number of lines before the current line to include. */
  linesBefore?: InputMaybe<Scalars["Int"]["input"]>;
};

/** Input for a user satisfaction (NPS) survey submission. */
export type SurveySubmissionInput = {
  /** The answer to "What would make Sourcegraph better?" */
  better?: InputMaybe<Scalars["String"]["input"]>;
  /**
   * User-provided email address, if there is no currently authenticated user. If there is, this value
   * will not be used.
   */
  email?: InputMaybe<Scalars["String"]["input"]>;
  /** The answer to "What do you use Sourcegraph for?". */
  otherUseCase?: InputMaybe<Scalars["String"]["input"]>;
  /** User's likelihood of recommending Sourcegraph to a friend, from 0-10. */
  score: Scalars["Int"]["input"];
};

/** Possible answers to "You use Sourcegraph to..." in the NPS Survey. */
export enum SurveyUseCase {
  FixSecurityVulnerabilities = "FIX_SECURITY_VULNERABILITIES",
  ImproveCodeQuality = "IMPROVE_CODE_QUALITY",
  RespondToIncidents = "RESPOND_TO_INCIDENTS",
  ReuseCode = "REUSE_CODE",
  UnderstandNewCode = "UNDERSTAND_NEW_CODE",
}

/** EXPERIMENTAL: This type may make backwards-incompatible changes in the future. */
export type SymbolComparator = {
  /** Describes how the symbol name should be compared. */
  name: SymbolNameComparator;
  /**
   * Describes the provenance of the symbol. This value should be based
   * on the provenance value obtained from the CodeGraphData type.
   */
  provenance: CodeGraphDataProvenanceComparator;
};

/**
 * All possible kinds of symbols. This set matches that of the Language Server Protocol
 * (https://microsoft.github.io/language-server-protocol/specification#workspace_symbol).
 */
export enum SymbolKind {
  Array = "ARRAY",
  Boolean = "BOOLEAN",
  Class = "CLASS",
  Constant = "CONSTANT",
  Constructor = "CONSTRUCTOR",
  Enum = "ENUM",
  Enummember = "ENUMMEMBER",
  Event = "EVENT",
  Field = "FIELD",
  File = "FILE",
  Function = "FUNCTION",
  Interface = "INTERFACE",
  Key = "KEY",
  Method = "METHOD",
  Module = "MODULE",
  Namespace = "NAMESPACE",
  Null = "NULL",
  Number = "NUMBER",
  Object = "OBJECT",
  Operator = "OPERATOR",
  Package = "PACKAGE",
  Property = "PROPERTY",
  String = "STRING",
  Struct = "STRUCT",
  Typeparameter = "TYPEPARAMETER",
  Unknown = "UNKNOWN",
  Variable = "VARIABLE",
}

/** EXPERIMENTAL: This type may make backwards-incompatible changes in the future. */
export type SymbolNameComparator = {
  /** Checks for exact equality. */
  equals?: InputMaybe<Scalars["String"]["input"]>;
};

/** EXPERIMENTAL: This type may change in a backwards-compatible way. */
export enum SymbolRole {
  Definition = "DEFINITION",
  /**
   * Applicable for forward declarations in languages with header files (C, C++ etc.)
   * as well as standalone signatures in languages with separate interface files (OCaml etc.).
   */
  ForwardDefinition = "FORWARD_DEFINITION",
  Reference = "REFERENCE",
}

/**
 * Categorizes a usage based on its relationship to the symbol of interest.
 *
 * This enum may be expanded in the future.
 *
 * EXPERIMENTAL: This type may change in a backwards-incompatible way in the future.
 */
export enum SymbolUsageKind {
  /**
   * Denotes a usage as being a definition.
   *
   * interface Animal:
   *     sound()
   *
   * class Dog implements Animal:
   *     sound() override { ... }
   *
   * func makeSounds(animal: Animal, dog: Dog):
   *     animal.sound()
   *     //     ^---^ (1)
   *     dog.sound()
   *     //  ^---^ (2)
   *
   * Here, usagesForSymbol for (1) will return a Definition usage for Animal.sound().
   * Similarly, usagesForSymbol for (2) will return a Definition usage for Dog.sound().
   *
   * In the general case, a symbol may have multiple definitions.
   * Here are some examples:
   *
   * 1. Python allows for multiple inheritance, so the same field can
   *    be declared in multiple parent classes. In such a situation,
   *    even Precise results may have multiple definitions.
   * 2. A function may have different definitions based on the build
   *    configuration, such as for macOS vs Windows. A precise SCIP indexer
   *    may unify all such definitions into a single index as SCIP
   *    currently (as of June 20 2024) doesn't support tracking build
   *    configuration.
   * 3. Syntactic or search-based results may not be able to find the
   *    exact definition, so they may return a superset of the full set
   *    of definitions.
   */
  Definition = "DEFINITION",
  /**
   * Denotes a usage as being an 'implementation', generally of a method, interface
   * or similar (the exact terminology varies across languages - traits, protocols etc.).
   *
   * For example, consider the following pseudocode:
   *
   * interface Animal:
   * //        ^----^ (1)
   *     sound()
   * //  ^---^ (2)
   *
   * class Dog implements Animal:
   *     sound() override { ... }
   *
   * Here, usagesForSymbol for (1) will return an Implementation usage for Dog.
   * Similarly, usagesForSymbol for (2) will return an Implementation usage for Dog.sound().
   *
   * As of June 20 2024, Implementation usages are only supported by
   * Precise indexers. Syntactic and search-based usagesForSymbol will mark all
   * such usages as Reference.
   */
  Implementation = "IMPLEMENTATION",
  /**
   * Denotes a usage as being a reference. References are unified across
   * the inheritance hierarchy. For example, consider the following pseudocode:
   *
   * interface Animal:
   *     sound()
   *
   * class Dog implements Animal:
   *     sound() override { ... }
   *
   * func makeSounds(animal: Animal, dog: Dog):
   *     animal.sound()
   *     //     ^---^ (1)
   *     dog.sound()
   *     //  ^---^ (2)
   *
   * Here, usagesForSymbol for both (1) and (2) will return Reference usages
   * for both Animal.sound() and Dog.sound().
   * - For (1), it makes sense to also return reference usages for Dog.sound()
   *   because 'animal' may actually be a Dog.
   * - For (2), it makes sense to also return reference usages for Animal.sound()
   *   because 'dog' value may be up-cast to Animal at some point and the
   *   and 'sound()' might be called on it after that.
   */
  Reference = "REFERENCE",
  /**
   * Denotes a usage as being a 'super', generally of a method, type or similar.
   * The exact terminology varies across languages and the syntax under question -
   * for functions, it might be 'superclass method', 'interface method', 'trait method' etc.
   * and for types, it might be 'superclass', 'interface', 'trait' etc.
   *
   * For example, consider the following pseudocode:
   *
   * interface Animal:
   *     sound()
   *
   * class Dog implements Animal:
   *     sound() override { ... }
   *
   * func bark(dog: Dog):
   *     //         ^-^ (1)
   *     dog.sound()
   *     //  ^---^ (2)
   *
   * Here, usagesForSymbol for (1) will return a Super usage for Animal.
   * Similarly, usagesForSymbol for (2) will return a Super usage for Animal.sound().
   *
   * As of June 20 2024, Super usages are only supported by
   * Precise indexers. Syntactic and search-based usagesForSymbol will mark all
   * such usages as Reference.
   *
   * UI note: Strictly speaking, depending on the exact symbol and language under
   * consideration, 'Super' usages would be better be grouped under a heading like:
   *
   * - Method specification (for methods satisfying the signature of an interface
   *   method in Go or Java)
   * - Interface (for types implementing an interface in Go or Java)
   * - Trait method (for methods satisfying the signature of a trait method in Rust)
   * - Trait (for types implementing a trait in Rust)
   *
   * and so on. Due to this large variation across languages, we've chosen
   * to group all such usages under 'Super' for now.
   *
   * Historical note: This was previously called 'prototype' in the old API.
   * However, 'prototype' has a specific meaning in C++ different from our usage,
   * so we recommend avoiding the term 'prototype' in the UI.
   */
  Super = "SUPER",
}

/**
 * Options to specify a user for team membership. Multiple options can be provided,
 * with the following precedence order: (Other mismatches will be discarded)
 * - UserID
 * - Username
 * - Email
 * - External Account fields
 *
 * Examples:
 * - If ID is set and no match, return.
 * - If ID and username is set, and ID matches but username doesn't, match.
 */
export type TeamMemberInput = {
  /** If the email is associated to a user and verified, the user account will be matched. */
  email?: InputMaybe<Scalars["String"]["input"]>;
  /**
   * If the user has an associated external account, use this.
   * externalAccountServiceID and externalAccountServiceType must be set and
   * either of externalAccountAccountID externalAccountLogin are required as well.
   * Account ID is the unique identifier on the external account platform.
   */
  externalAccountAccountID?: InputMaybe<Scalars["String"]["input"]>;
  /**
   * If the user has an associated external account, use this.
   * externalAccountServiceID and externalAccountServiceType must be set and
   * either of externalAccountAccountID externalAccountLogin are required as well.
   * Account Login is usually the username on the external account platform.
   */
  externalAccountLogin?: InputMaybe<Scalars["String"]["input"]>;
  /**
   * If the user has an associated external account, use this.
   * externalAccountServiceID and externalAccountServiceType must be set and
   * either of externalAccountAccountID externalAccountLogin are required as well.
   * Service ID for the GitHub OAuth provider, for example, is https://github.com/.
   */
  externalAccountServiceID?: InputMaybe<Scalars["String"]["input"]>;
  /**
   * If the user has an associated external account, use this.
   * externalAccountServiceID and externalAccountServiceType must be set and
   * either of externalAccountAccountID externalAccountLogin are required as well.
   * Service Type for the GitHub OAuth provider, for example, is github.
   */
  externalAccountServiceType?: InputMaybe<Scalars["String"]["input"]>;
  /** Explicitly define a user by ID. */
  userID?: InputMaybe<Scalars["ID"]["input"]>;
  /** Explicitly define a user by username in Sourcegraph. */
  username?: InputMaybe<Scalars["String"]["input"]>;
};

/** Billing-related metadata for a telemetry event. */
export type TelemetryEventBillingMetadataInput = {
  /**
   * Billing category ID the event falls into.
   *
   * IDs must come from a static set of values in libraries - it is left as a
   * string in the API to allow some flexibility.
   */
  category: Scalars["String"]["input"];
  /**
   * Billing product ID associated with the event.
   *
   * IDs must come from a static set of values in libraries - it is left as a
   * string in the API to allow some flexibility.
   */
  product: Scalars["String"]["input"];
};

/** Properties comprising a telemetry V2 event that can be reported by a client. */
export type TelemetryEventInput = {
  /**
   * Action associated with the event in camelCase, e.g. 'pageView'.
   *
   * Action names must come from a static set of values in libraries - it is
   * left as a string in the API to allow some flexibility.
   */
  action: Scalars["String"]["input"];
  /**
   * Feature associated with the event in camelCase, e.g. 'myFeature'.
   *
   * Feature names must come from a static set of values in libraries - it is
   * left as a string in the API to allow some flexibility.
   */
  feature: Scalars["String"]["input"];
  /**
   * Optional marketing campaign tracking parameters.
   *
   * 🚨 SECURITY: This metadata is NEVER exported from private Sourcegraph instances,
   * and is only exported for events tracked in the public Sourcegraph.com instance.
   */
  marketingTracking?: InputMaybe<TelemetryEventMarketingTrackingInput>;
  /** Parameters of the event. */
  parameters: TelemetryEventParametersInput;
  /** Information about where this event came from. */
  source: TelemetryEventSourceInput;
  /**
   * Timestamp at which the time was recorded. If not provided, a timestamp is
   * generated when the server receives the event, but this does not guarantee
   * consistent ordering or accuracy.
   *
   * This parameter is only available in Sourcegraph 5.2.5 and later.
   */
  timestamp?: InputMaybe<Scalars["DateTime"]["input"]>;
};

/**
 * Marketing campaign tracking parameters for a telemetry V2 event.
 *
 * 🚨 SECURITY: This metadata is NEVER exported from private Sourcegraph instances,
 * and is only exported for events tracked in the public Sourcegraph.com instance.
 */
export type TelemetryEventMarketingTrackingInput = {
  /** Cohort ID to identify the user as part of a specific A/B test. */
  cohortID?: InputMaybe<Scalars["String"]["input"]>;
  /** Device session ID to identify the user's session. */
  deviceSessionID?: InputMaybe<Scalars["String"]["input"]>;
  /** Initial URL the user landed on. */
  firstSourceURL?: InputMaybe<Scalars["String"]["input"]>;
  /** Last source URL visited by the user. */
  lastSourceURL?: InputMaybe<Scalars["String"]["input"]>;
  /** Referrer URL that refers the user to Sourcegraph. */
  referrer?: InputMaybe<Scalars["String"]["input"]>;
  /** First URL the user visited in their current session. */
  sessionFirstURL?: InputMaybe<Scalars["String"]["input"]>;
  /** Session referrer URL for the user. */
  sessionReferrer?: InputMaybe<Scalars["String"]["input"]>;
  /** URL the event occurred on. */
  url?: InputMaybe<Scalars["String"]["input"]>;
};

/** A single, PII-free metadata item for telemetry V2 events. */
export type TelemetryEventMetadataInput = {
  /** The key identifying this metadata entry. */
  key: Scalars["String"]["input"];
  /**
   * Numeric value associated with the key. Enforcing numeric values eliminates
   * risks of accidentally shipping sensitive or private data.
   *
   * The value type in the schema is JSONValue for flexibility, but we ONLY
   * accept numeric values (integers and floats) - any other value will be
   * rejected.
   */
  value: Scalars["JSONValue"]["input"];
};

/** Properties of a telemetry V2 event. */
export type TelemetryEventParametersInput = {
  /** Billing-related metadata. */
  billingMetadata?: InputMaybe<TelemetryEventBillingMetadataInput>;
  /**
   * Optional interaction ID that can be provided to indicate the interaction
   * this event belongs to. It overrides the X-Sourcegraph-Interaction-ID header
   * if one is set on the request recording the event.
   *
   * This parameter is only available in Sourcegraph 5.2.4 and later.
   */
  interactionID?: InputMaybe<Scalars["String"]["input"]>;
  /** Strictly typed metadata that must not contain any sensitive data or PII. */
  metadata?: InputMaybe<Array<TelemetryEventMetadataInput>>;
  /**
   * Private metadata in JSON format. Unlike metadata, values can be of any type,
   * not just numeric.
   *
   * 🚨 SECURITY: This metadata is NOT exported from instances by default, as it
   * can contain arbitrarily-shaped data that may accidentally contain sensitive
   * or private contents.
   */
  privateMetadata?: InputMaybe<Scalars["JSONValue"]["input"]>;
  /**
   * Version of the event parameters, used for indicating the "shape" of this
   * event's metadata.
   */
  version: Scalars["Int"]["input"];
};

/** Properties comprising the source of a telemetry V2 event reported by a client. */
export type TelemetryEventSourceInput = {
  /** Source client of the event. */
  client: Scalars["String"]["input"];
  /** Version of the source client of the event. */
  clientVersion?: InputMaybe<Scalars["String"]["input"]>;
};

/** A time scope defined using a time interval (ex. 5 days) */
export type TimeIntervalStepInput = {
  /** The time unit for the interval. */
  unit: TimeIntervalStepUnit;
  /** The value for the interval. */
  value: Scalars["Int"]["input"];
};

/** Time interval units. */
export enum TimeIntervalStepUnit {
  Day = "DAY",
  Hour = "HOUR",
  Month = "MONTH",
  Week = "WEEK",
  Year = "YEAR",
}

/** A custom time scope for an insight data series. */
export type TimeScopeInput = {
  /** Sets a time scope using a step interval (intervals of time). */
  stepInterval?: InputMaybe<TimeIntervalStepInput>;
};

/** Fields to update for an existing external service. */
export type UpdateExternalServiceInput = {
  /** The updated config, if provided. */
  config?: InputMaybe<Scalars["String"]["input"]>;
  /** The updated display name, if provided. */
  displayName?: InputMaybe<Scalars["String"]["input"]>;
  /** The id of the external service to update. */
  id: Scalars["ID"]["input"];
};

/** Input object for update insight series mutation. */
export type UpdateInsightSeriesInput = {
  /** The desired activity state (enabled or disabled) for the series. */
  enabled?: InputMaybe<Scalars["Boolean"]["input"]>;
  /** Unique ID for the series. */
  seriesId: Scalars["String"]["input"];
};

/** Input object for updating a dashboard. */
export type UpdateInsightsDashboardInput = {
  /** Permissions to grant to the dashboard. */
  grants?: InputMaybe<InsightsPermissionGrantsInput>;
  /** Dashboard title. */
  title?: InputMaybe<Scalars["String"]["input"]>;
};

/** Input for updating a line chart search insight. */
export type UpdateLineChartSearchInsightInput = {
  /** The complete list of data series on this line chart. Note: excluding a data series will remove it. */
  dataSeries: Array<LineChartSearchInsightDataSeriesInput>;
  /** The presentation options for this line chart. */
  presentationOptions: LineChartOptionsInput;
  /** The scope of repositories for the insight, this scope will apply to all dataSeries unless another scope is provided by a series. */
  repositoryScope?: InputMaybe<RepositoryScopeInput>;
  /** The time scope for this insight, this scope will apply to all dataSeries unless another scope is provided by a series. */
  timeScope?: InputMaybe<TimeScopeInput>;
  /** The default values for filters and aggregates for this line chart. */
  viewControls: InsightViewControlsInput;
};

/** Input for updating a pie chart search insight */
export type UpdatePieChartSearchInsightInput = {
  /** Options for this pie chart. */
  presentationOptions: PieChartOptionsInput;
  /** The query string. */
  query: Scalars["String"]["input"];
  /** The scope of repositories. */
  repositoryScope: RepositoryScopeInput;
};

/** UpdateSignalConfigurationsInput represents the input for updating multiple signal configurations. */
export type UpdateSignalConfigurationsInput = {
  /** The signal configuration updates. */
  configs: Array<OwnSignalConfigurationUpdate>;
};

/**
 * An empty filter allows all kinds of usages for all paths in all repositories.
 *
 * However, if the symbol used for lookup is a file-local symbol or a
 * repository-local symbol, then usages will automatically be limited to the
 * same file or same repository respectively.
 *
 * EXPERIMENTAL: This type may make backwards-incompatible changes in the future.
 */
export type UsagesFilter = {
  /**
   * Negate another UsageFilter. For example, this can be used to find matches
   * outside of a specific repository.
   */
  not?: InputMaybe<UsagesFilter>;
  /**
   * Filter for limiting which repositories to find the usages in.
   * For cross-repository symbols as well as search-based results,
   * an empty value will find results across the Sourcegraph instance.
   */
  repository?: InputMaybe<RepositoryFilter>;
};

/** A period of time in which a set of users have been active. */
export enum UserActivePeriod {
  /** All time. */
  AllTime = "ALL_TIME",
  /** Since the first day of the current month at 00:00 UTC. */
  ThisMonth = "THIS_MONTH",
  /** Since the latest Monday at 00:00 UTC. */
  ThisWeek = "THIS_WEEK",
  /** Since today at 00:00 UTC. */
  Today = "TODAY",
}

/** A user event. */
export enum UserEvent {
  Codeintel = "CODEINTEL",
  Codeintelintegration = "CODEINTELINTEGRATION",
  Codeintelintegrationrefs = "CODEINTELINTEGRATIONREFS",
  Codeintelrefs = "CODEINTELREFS",
  Pageview = "PAGEVIEW",
  Searchquery = "SEARCHQUERY",
  Stageautomate = "STAGEAUTOMATE",
  Stagecode = "STAGECODE",
  Stageconfigure = "STAGECONFIGURE",
  Stagedeploy = "STAGEDEPLOY",
  /** Product stages */
  Stagemanage = "STAGEMANAGE",
  Stagemonitor = "STAGEMONITOR",
  Stagepackage = "STAGEPACKAGE",
  Stageplan = "STAGEPLAN",
  Stagereview = "STAGEREVIEW",
  Stagesecure = "STAGESECURE",
  Stageverify = "STAGEVERIFY",
}

/** Input type of a user (identified either by username or email address) with its repository permission. */
export type UserPermissionInput = {
  /**
   * Depending on the bindID option in the permissions.userMapping site configuration property,
   * the elements of the list are either all usernames (bindID of "username") or all email
   * addresses (bindID of "email").
   */
  bindID: Scalars["String"]["input"];
  /** The highest level of repository permission. */
  permission?: InputMaybe<RepositoryPermission>;
};

/** A user (identified either by username or email address) with its sub-repository permissions. */
export type UserSubRepoPermission = {
  /**
   * Depending on the bindID option in the permissions.userMapping site configuration property,
   * the elements of the list are either all usernames (bindID of "username") or all email
   * addresses (bindID of "email").
   */
  bindID: Scalars["String"]["input"];
  /**
   * DEPRECATED
   * An array of paths that the user is not allowed to access, in glob format.
   */
  pathExcludes?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /**
   * DEPRECATED
   * An array of paths that the user is allowed to access, in glob format.
   */
  pathIncludes?: InputMaybe<Array<Scalars["String"]["input"]>>;
  /**
   * An array of paths in glob format. Paths starting with a minus (-)
   * (i.e. "-/dev/private") prevent access, otherwise paths grant access.
   * The last applicable path takes precedence.
   * When paths is set, pathIncludes and pathExcludes are ignored.
   */
  paths?: InputMaybe<Array<Scalars["String"]["input"]>>;
};

/** Possible sort orderings for a workspace connection. */
export enum WorkspacesSortOrder {
  /** Sort by repository name in ascending order. */
  RepoNameAsc = "REPO_NAME_ASC",
  /** Sort by repository name in descending order. */
  RepoNameDesc = "REPO_NAME_DESC",
}

export type OperationIdFragment = { __typename?: "BulkOperation"; id: string };

type ChangesetId_ExternalChangeset_Fragment = { __typename?: "ExternalChangeset"; id: string };

type ChangesetId_HiddenExternalChangeset_Fragment = { __typename?: "HiddenExternalChangeset"; id: string };

export type ChangesetIdFragment = ChangesetId_ExternalChangeset_Fragment | ChangesetId_HiddenExternalChangeset_Fragment;

export type PublishChangesetMutationVariables = Exact<{
  batchChange: Scalars["ID"]["input"];
  changeset: Scalars["ID"]["input"];
}>;

export type PublishChangesetMutation = {
  __typename?: "Mutation";
  publishChangesets: { __typename?: "BulkOperation"; id: string };
};

export type ReenqueueChangesetMutationVariables = Exact<{
  changeset: Scalars["ID"]["input"];
}>;

export type ReenqueueChangesetMutation = {
  __typename?: "Mutation";
  reenqueueChangeset:
    | { __typename?: "ExternalChangeset"; id: string }
    | { __typename?: "HiddenExternalChangeset"; id: string };
};

export type MergeChangesetMutationVariables = Exact<{
  batchChange: Scalars["ID"]["input"];
  changeset: Scalars["ID"]["input"];
  squash?: InputMaybe<Scalars["Boolean"]["input"]>;
}>;

export type MergeChangesetMutation = {
  __typename?: "Mutation";
  mergeChangesets: { __typename?: "BulkOperation"; id: string };
};

export type BatchChangeFragment = {
  __typename?: "BatchChange";
  id: string;
  url: string;
  name: string;
  description?: string | null;
  state: BatchChangeState;
  updatedAt: any;
  namespace:
    | { __typename?: "Org"; id: string; namespaceName: string }
    | { __typename?: "User"; id: string; namespaceName: string };
  creator?: { __typename?: "User"; username: string; displayName?: string | null } | null;
  changesetsStats: {
    __typename?: "ChangesetsStats";
    total: number;
    merged: number;
    open: number;
    closed: number;
    failed: number;
    unpublished: number;
    draft: number;
  };
};

export type GetBatchChangesQueryVariables = Exact<{ [key: string]: never }>;

export type GetBatchChangesQuery = {
  __typename?: "Query";
  batchChanges: {
    __typename?: "BatchChangeConnection";
    nodes: Array<{
      __typename?: "BatchChange";
      id: string;
      url: string;
      name: string;
      description?: string | null;
      state: BatchChangeState;
      updatedAt: any;
      namespace:
        | { __typename?: "Org"; id: string; namespaceName: string }
        | { __typename?: "User"; id: string; namespaceName: string };
      creator?: { __typename?: "User"; username: string; displayName?: string | null } | null;
      changesetsStats: {
        __typename?: "ChangesetsStats";
        total: number;
        merged: number;
        open: number;
        closed: number;
        failed: number;
        unpublished: number;
        draft: number;
      };
    }>;
  };
};

type Changeset_ExternalChangeset_Fragment = {
  __typename: "ExternalChangeset";
  externalID?: string | null;
  title?: string | null;
  reviewState?: ChangesetReviewState | null;
  checkState?: ChangesetCheckState | null;
  id: string;
  state: ChangesetState;
  updatedAt: any;
  repository: { __typename?: "Repository"; name: string };
  externalURL?: { __typename?: "ExternalLink"; url: string; serviceKind?: ExternalServiceKind | null } | null;
};

type Changeset_HiddenExternalChangeset_Fragment = {
  __typename: "HiddenExternalChangeset";
  id: string;
  state: ChangesetState;
  updatedAt: any;
};

export type ChangesetFragment = Changeset_ExternalChangeset_Fragment | Changeset_HiddenExternalChangeset_Fragment;

export type GetChangesetsQueryVariables = Exact<{
  namespace: Scalars["ID"]["input"];
  name: Scalars["String"]["input"];
}>;

export type GetChangesetsQuery = {
  __typename?: "Query";
  batchChange?: {
    __typename?: "BatchChange";
    changesets: {
      __typename?: "ChangesetConnection";
      nodes: Array<
        | {
            __typename: "ExternalChangeset";
            externalID?: string | null;
            title?: string | null;
            reviewState?: ChangesetReviewState | null;
            checkState?: ChangesetCheckState | null;
            id: string;
            state: ChangesetState;
            updatedAt: any;
            repository: { __typename?: "Repository"; name: string };
            externalURL?: { __typename?: "ExternalLink"; url: string; serviceKind?: ExternalServiceKind | null } | null;
          }
        | { __typename: "HiddenExternalChangeset"; id: string; state: ChangesetState; updatedAt: any }
      >;
    };
  } | null;
};

export type BlobContentsFragment = {
  __typename?: "GitBlob";
  path: string;
  content: string;
  binary: boolean;
  byteSize: number;
};

export type GetFileContentsQueryVariables = Exact<{
  repo: Scalars["String"]["input"];
  rev: Scalars["String"]["input"];
  path: Scalars["String"]["input"];
}>;

export type GetFileContentsQuery = {
  __typename?: "Query";
  repository?: {
    __typename?: "Repository";
    id: string;
    commit?: {
      __typename?: "GitCommit";
      id: string;
      blob?: { __typename?: "GitBlob"; path: string; content: string; binary: boolean; byteSize: number } | null;
    } | null;
  } | null;
};

export type SearchNotebookFragment = {
  __typename?: "Notebook";
  id: string;
  title: string;
  viewerHasStarred: boolean;
  public: boolean;
  createdAt: any;
  updatedAt: any;
  stars: { __typename?: "NotebookStarConnection"; totalCount: number };
  creator?: { __typename?: "User"; username: string; displayName?: string | null; url: string } | null;
  namespace?:
    | { __typename?: "Org"; namespaceName: string; url: string }
    | { __typename?: "User"; namespaceName: string; url: string }
    | null;
  blocks: Array<
    | {
        __typename: "FileBlock";
        fileInput: { __typename?: "FileBlockInput"; repositoryName: string; filePath: string };
      }
    | { __typename: "MarkdownBlock"; markdownInput: string }
    | { __typename: "QueryBlock"; queryInput: string }
    | {
        __typename: "SymbolBlock";
        symbolInput: {
          __typename?: "SymbolBlockInput";
          repositoryName: string;
          filePath: string;
          symbolName: string;
          symbolContainerName: string;
          symbolKind: SymbolKind;
        };
      }
  >;
};

export type GetNotebooksQueryVariables = Exact<{
  query: Scalars["String"]["input"];
  orderBy?: InputMaybe<NotebooksOrderBy>;
}>;

export type GetNotebooksQuery = {
  __typename?: "Query";
  notebooks: {
    __typename?: "NotebookConnection";
    nodes: Array<{
      __typename?: "Notebook";
      id: string;
      title: string;
      viewerHasStarred: boolean;
      public: boolean;
      createdAt: any;
      updatedAt: any;
      stars: { __typename?: "NotebookStarConnection"; totalCount: number };
      creator?: { __typename?: "User"; username: string; displayName?: string | null; url: string } | null;
      namespace?:
        | { __typename?: "Org"; namespaceName: string; url: string }
        | { __typename?: "User"; namespaceName: string; url: string }
        | null;
      blocks: Array<
        | {
            __typename: "FileBlock";
            fileInput: { __typename?: "FileBlockInput"; repositoryName: string; filePath: string };
          }
        | { __typename: "MarkdownBlock"; markdownInput: string }
        | { __typename: "QueryBlock"; queryInput: string }
        | {
            __typename: "SymbolBlock";
            symbolInput: {
              __typename?: "SymbolBlockInput";
              repositoryName: string;
              filePath: string;
              symbolName: string;
              symbolContainerName: string;
              symbolKind: SymbolKind;
            };
          }
      >;
    }>;
  };
};

export type RecordEventsMutationVariables = Exact<{
  events: Array<TelemetryEventInput> | TelemetryEventInput;
}>;

export type RecordEventsMutation = {
  __typename?: "Mutation";
  telemetry: {
    __typename?: "TelemetryMutation";
    recordEvents?: { __typename?: "EmptyResponse"; alwaysNil?: string | null } | null;
  };
};

export const OperationIdFragmentDoc = gql`
  fragment OperationID on BulkOperation {
    id
  }
`;
export const ChangesetIdFragmentDoc = gql`
  fragment ChangesetID on Changeset {
    id
  }
`;
export const BatchChangeFragmentDoc = gql`
  fragment BatchChange on BatchChange {
    id
    url
    namespace {
      id
      namespaceName
    }
    name
    description
    creator {
      username
      displayName
    }
    state
    updatedAt
    changesetsStats {
      total
      merged
      open
      closed
      failed
      unpublished
      draft
    }
  }
`;
export const ChangesetFragmentDoc = gql`
  fragment Changeset on Changeset {
    __typename
    id
    state
    updatedAt
    ... on ExternalChangeset {
      repository {
        name
      }
      externalURL {
        url
        serviceKind
      }
      externalID
      title
      reviewState
      checkState
    }
  }
`;
export const BlobContentsFragmentDoc = gql`
  fragment BlobContents on GitBlob {
    path
    content
    binary
    byteSize
  }
`;
export const SearchNotebookFragmentDoc = gql`
  fragment SearchNotebook on Notebook {
    id
    title
    viewerHasStarred
    public
    stars {
      totalCount
    }
    creator {
      username
      displayName
      url
    }
    namespace {
      namespaceName
      url
    }
    blocks {
      __typename
      ... on MarkdownBlock {
        markdownInput
      }
      ... on QueryBlock {
        queryInput
      }
      ... on FileBlock {
        fileInput {
          repositoryName
          filePath
        }
      }
      ... on SymbolBlock {
        symbolInput {
          repositoryName
          filePath
          symbolName
          symbolContainerName
          symbolKind
        }
      }
    }
    createdAt
    updatedAt
  }
`;
export const PublishChangesetDocument = gql`
  mutation PublishChangeset($batchChange: ID!, $changeset: ID!) {
    publishChangesets(batchChange: $batchChange, changesets: [$changeset]) {
      ...OperationID
    }
  }
  ${OperationIdFragmentDoc}
`;
export type PublishChangesetMutationFn = Apollo.MutationFunction<
  PublishChangesetMutation,
  PublishChangesetMutationVariables
>;

/**
 * __usePublishChangesetMutation__
 *
 * To run a mutation, you first call `usePublishChangesetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePublishChangesetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [publishChangesetMutation, { data, loading, error }] = usePublishChangesetMutation({
 *   variables: {
 *      batchChange: // value for 'batchChange'
 *      changeset: // value for 'changeset'
 *   },
 * });
 */
export function usePublishChangesetMutation(
  baseOptions?: Apollo.MutationHookOptions<PublishChangesetMutation, PublishChangesetMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<PublishChangesetMutation, PublishChangesetMutationVariables>(
    PublishChangesetDocument,
    options,
  );
}
export type PublishChangesetMutationHookResult = ReturnType<typeof usePublishChangesetMutation>;
export type PublishChangesetMutationResult = Apollo.MutationResult<PublishChangesetMutation>;
export type PublishChangesetMutationOptions = Apollo.BaseMutationOptions<
  PublishChangesetMutation,
  PublishChangesetMutationVariables
>;
export const ReenqueueChangesetDocument = gql`
  mutation ReenqueueChangeset($changeset: ID!) {
    reenqueueChangeset(changeset: $changeset) {
      ...ChangesetID
    }
  }
  ${ChangesetIdFragmentDoc}
`;
export type ReenqueueChangesetMutationFn = Apollo.MutationFunction<
  ReenqueueChangesetMutation,
  ReenqueueChangesetMutationVariables
>;

/**
 * __useReenqueueChangesetMutation__
 *
 * To run a mutation, you first call `useReenqueueChangesetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReenqueueChangesetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reenqueueChangesetMutation, { data, loading, error }] = useReenqueueChangesetMutation({
 *   variables: {
 *      changeset: // value for 'changeset'
 *   },
 * });
 */
export function useReenqueueChangesetMutation(
  baseOptions?: Apollo.MutationHookOptions<ReenqueueChangesetMutation, ReenqueueChangesetMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<ReenqueueChangesetMutation, ReenqueueChangesetMutationVariables>(
    ReenqueueChangesetDocument,
    options,
  );
}
export type ReenqueueChangesetMutationHookResult = ReturnType<typeof useReenqueueChangesetMutation>;
export type ReenqueueChangesetMutationResult = Apollo.MutationResult<ReenqueueChangesetMutation>;
export type ReenqueueChangesetMutationOptions = Apollo.BaseMutationOptions<
  ReenqueueChangesetMutation,
  ReenqueueChangesetMutationVariables
>;
export const MergeChangesetDocument = gql`
  mutation MergeChangeset($batchChange: ID!, $changeset: ID!, $squash: Boolean) {
    mergeChangesets(batchChange: $batchChange, changesets: [$changeset], squash: $squash) {
      ...OperationID
    }
  }
  ${OperationIdFragmentDoc}
`;
export type MergeChangesetMutationFn = Apollo.MutationFunction<MergeChangesetMutation, MergeChangesetMutationVariables>;

/**
 * __useMergeChangesetMutation__
 *
 * To run a mutation, you first call `useMergeChangesetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMergeChangesetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [mergeChangesetMutation, { data, loading, error }] = useMergeChangesetMutation({
 *   variables: {
 *      batchChange: // value for 'batchChange'
 *      changeset: // value for 'changeset'
 *      squash: // value for 'squash'
 *   },
 * });
 */
export function useMergeChangesetMutation(
  baseOptions?: Apollo.MutationHookOptions<MergeChangesetMutation, MergeChangesetMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<MergeChangesetMutation, MergeChangesetMutationVariables>(MergeChangesetDocument, options);
}
export type MergeChangesetMutationHookResult = ReturnType<typeof useMergeChangesetMutation>;
export type MergeChangesetMutationResult = Apollo.MutationResult<MergeChangesetMutation>;
export type MergeChangesetMutationOptions = Apollo.BaseMutationOptions<
  MergeChangesetMutation,
  MergeChangesetMutationVariables
>;
export const GetBatchChangesDocument = gql`
  query GetBatchChanges {
    batchChanges(first: 250) {
      nodes {
        ...BatchChange
      }
    }
  }
  ${BatchChangeFragmentDoc}
`;

/**
 * __useGetBatchChangesQuery__
 *
 * To run a query within a React component, call `useGetBatchChangesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBatchChangesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBatchChangesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetBatchChangesQuery(
  baseOptions?: Apollo.QueryHookOptions<GetBatchChangesQuery, GetBatchChangesQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetBatchChangesQuery, GetBatchChangesQueryVariables>(GetBatchChangesDocument, options);
}
export function useGetBatchChangesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetBatchChangesQuery, GetBatchChangesQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetBatchChangesQuery, GetBatchChangesQueryVariables>(GetBatchChangesDocument, options);
}
export function useGetBatchChangesSuspenseQuery(
  baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetBatchChangesQuery, GetBatchChangesQueryVariables>,
) {
  const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<GetBatchChangesQuery, GetBatchChangesQueryVariables>(GetBatchChangesDocument, options);
}
export type GetBatchChangesQueryHookResult = ReturnType<typeof useGetBatchChangesQuery>;
export type GetBatchChangesLazyQueryHookResult = ReturnType<typeof useGetBatchChangesLazyQuery>;
export type GetBatchChangesSuspenseQueryHookResult = ReturnType<typeof useGetBatchChangesSuspenseQuery>;
export type GetBatchChangesQueryResult = Apollo.QueryResult<GetBatchChangesQuery, GetBatchChangesQueryVariables>;
export const GetChangesetsDocument = gql`
  query GetChangesets($namespace: ID!, $name: String!) {
    batchChange(namespace: $namespace, name: $name) {
      changesets {
        nodes {
          ...Changeset
        }
      }
    }
  }
  ${ChangesetFragmentDoc}
`;

/**
 * __useGetChangesetsQuery__
 *
 * To run a query within a React component, call `useGetChangesetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetChangesetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetChangesetsQuery({
 *   variables: {
 *      namespace: // value for 'namespace'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useGetChangesetsQuery(
  baseOptions: Apollo.QueryHookOptions<GetChangesetsQuery, GetChangesetsQueryVariables> &
    ({ variables: GetChangesetsQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetChangesetsQuery, GetChangesetsQueryVariables>(GetChangesetsDocument, options);
}
export function useGetChangesetsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetChangesetsQuery, GetChangesetsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetChangesetsQuery, GetChangesetsQueryVariables>(GetChangesetsDocument, options);
}
export function useGetChangesetsSuspenseQuery(
  baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetChangesetsQuery, GetChangesetsQueryVariables>,
) {
  const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<GetChangesetsQuery, GetChangesetsQueryVariables>(GetChangesetsDocument, options);
}
export type GetChangesetsQueryHookResult = ReturnType<typeof useGetChangesetsQuery>;
export type GetChangesetsLazyQueryHookResult = ReturnType<typeof useGetChangesetsLazyQuery>;
export type GetChangesetsSuspenseQueryHookResult = ReturnType<typeof useGetChangesetsSuspenseQuery>;
export type GetChangesetsQueryResult = Apollo.QueryResult<GetChangesetsQuery, GetChangesetsQueryVariables>;
export const GetFileContentsDocument = gql`
  query GetFileContents($repo: String!, $rev: String!, $path: String!) {
    repository(name: $repo) {
      id
      commit(rev: $rev) {
        id
        blob(path: $path) {
          ...BlobContents
        }
      }
    }
  }
  ${BlobContentsFragmentDoc}
`;

/**
 * __useGetFileContentsQuery__
 *
 * To run a query within a React component, call `useGetFileContentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFileContentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFileContentsQuery({
 *   variables: {
 *      repo: // value for 'repo'
 *      rev: // value for 'rev'
 *      path: // value for 'path'
 *   },
 * });
 */
export function useGetFileContentsQuery(
  baseOptions: Apollo.QueryHookOptions<GetFileContentsQuery, GetFileContentsQueryVariables> &
    ({ variables: GetFileContentsQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetFileContentsQuery, GetFileContentsQueryVariables>(GetFileContentsDocument, options);
}
export function useGetFileContentsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetFileContentsQuery, GetFileContentsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetFileContentsQuery, GetFileContentsQueryVariables>(GetFileContentsDocument, options);
}
export function useGetFileContentsSuspenseQuery(
  baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetFileContentsQuery, GetFileContentsQueryVariables>,
) {
  const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<GetFileContentsQuery, GetFileContentsQueryVariables>(GetFileContentsDocument, options);
}
export type GetFileContentsQueryHookResult = ReturnType<typeof useGetFileContentsQuery>;
export type GetFileContentsLazyQueryHookResult = ReturnType<typeof useGetFileContentsLazyQuery>;
export type GetFileContentsSuspenseQueryHookResult = ReturnType<typeof useGetFileContentsSuspenseQuery>;
export type GetFileContentsQueryResult = Apollo.QueryResult<GetFileContentsQuery, GetFileContentsQueryVariables>;
export const GetNotebooksDocument = gql`
  query GetNotebooks($query: String!, $orderBy: NotebooksOrderBy) {
    notebooks(query: $query, orderBy: $orderBy, descending: true) {
      nodes {
        ...SearchNotebook
      }
    }
  }
  ${SearchNotebookFragmentDoc}
`;

/**
 * __useGetNotebooksQuery__
 *
 * To run a query within a React component, call `useGetNotebooksQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetNotebooksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetNotebooksQuery({
 *   variables: {
 *      query: // value for 'query'
 *      orderBy: // value for 'orderBy'
 *   },
 * });
 */
export function useGetNotebooksQuery(
  baseOptions: Apollo.QueryHookOptions<GetNotebooksQuery, GetNotebooksQueryVariables> &
    ({ variables: GetNotebooksQueryVariables; skip?: boolean } | { skip: boolean }),
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetNotebooksQuery, GetNotebooksQueryVariables>(GetNotebooksDocument, options);
}
export function useGetNotebooksLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetNotebooksQuery, GetNotebooksQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetNotebooksQuery, GetNotebooksQueryVariables>(GetNotebooksDocument, options);
}
export function useGetNotebooksSuspenseQuery(
  baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetNotebooksQuery, GetNotebooksQueryVariables>,
) {
  const options = baseOptions === Apollo.skipToken ? baseOptions : { ...defaultOptions, ...baseOptions };
  return Apollo.useSuspenseQuery<GetNotebooksQuery, GetNotebooksQueryVariables>(GetNotebooksDocument, options);
}
export type GetNotebooksQueryHookResult = ReturnType<typeof useGetNotebooksQuery>;
export type GetNotebooksLazyQueryHookResult = ReturnType<typeof useGetNotebooksLazyQuery>;
export type GetNotebooksSuspenseQueryHookResult = ReturnType<typeof useGetNotebooksSuspenseQuery>;
export type GetNotebooksQueryResult = Apollo.QueryResult<GetNotebooksQuery, GetNotebooksQueryVariables>;
export const RecordEventsDocument = gql`
  mutation RecordEvents($events: [TelemetryEventInput!]!) {
    telemetry {
      recordEvents(events: $events) {
        alwaysNil
      }
    }
  }
`;
export type RecordEventsMutationFn = Apollo.MutationFunction<RecordEventsMutation, RecordEventsMutationVariables>;

/**
 * __useRecordEventsMutation__
 *
 * To run a mutation, you first call `useRecordEventsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRecordEventsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [recordEventsMutation, { data, loading, error }] = useRecordEventsMutation({
 *   variables: {
 *      events: // value for 'events'
 *   },
 * });
 */
export function useRecordEventsMutation(
  baseOptions?: Apollo.MutationHookOptions<RecordEventsMutation, RecordEventsMutationVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<RecordEventsMutation, RecordEventsMutationVariables>(RecordEventsDocument, options);
}
export type RecordEventsMutationHookResult = ReturnType<typeof useRecordEventsMutation>;
export type RecordEventsMutationResult = Apollo.MutationResult<RecordEventsMutation>;
export type RecordEventsMutationOptions = Apollo.BaseMutationOptions<
  RecordEventsMutation,
  RecordEventsMutationVariables
>;

export interface PossibleTypesResultData {
  possibleTypes: {
    [key: string]: string[];
  };
}
const result: PossibleTypesResultData = {
  possibleTypes: {
    BatchSpecWorkspace: ["HiddenBatchSpecWorkspace", "VisibleBatchSpecWorkspace"],
    Changeset: ["ExternalChangeset", "HiddenExternalChangeset"],
    ChangesetApplyPreview: ["HiddenChangesetApplyPreview", "VisibleChangesetApplyPreview"],
    ChangesetDescription: ["ExistingChangesetReference", "GitBranchChangesetDescription"],
    ChangesetSpec: ["HiddenChangesetSpec", "VisibleChangesetSpec"],
    CodyContextResult: ["FileChunkContext"],
    CommitSigningConfiguration: ["GitHubApp"],
    CommitVerification: ["GitHubCommitVerification"],
    ComputeResult: ["ComputeMatchContext", "ComputeText"],
    Connection: [
      "InsightBackfillQueueItemConnection",
      "NewUsersConnection",
      "PermissionsInfoRepositoriesConnection",
      "PermissionsInfoUsersConnection",
      "PermissionsSyncJobsConnection",
      "PromptsConnection",
      "RepoEmbeddingJobsConnection",
      "SavedSearchesConnection",
      "SiteConfigurationChangeConnection",
    ],
    ExternalServiceAvailability: [
      "ExternalServiceAvailabilityUnknown",
      "ExternalServiceAvailable",
      "ExternalServiceUnavailable",
    ],
    FeatureFlag: ["FeatureFlagBoolean", "FeatureFlagRollout"],
    File2: ["BatchSpecWorkspaceFile", "GitBlob", "VirtualFile"],
    GenericSearchResultInterface: ["CommitSearchResult", "Repository"],
    GitRevSpec: ["GitObject", "GitRef", "GitRevSpecExpr"],
    GitTreeOrBlob: ["GitBlob", "GitTree"],
    HiddenApplyPreviewTargets: [
      "HiddenApplyPreviewTargetsAttach",
      "HiddenApplyPreviewTargetsDetach",
      "HiddenApplyPreviewTargetsUpdate",
    ],
    IncompleteDatapointAlert: ["GenericIncompleteDatapointAlert", "TimeoutDatapointAlert"],
    InsightDataSeriesDefinition: ["SearchInsightDataSeriesDefinition"],
    InsightPresentation: ["LineChartInsightViewPresentation", "PieChartInsightViewPresentation"],
    InsightRepositoryDefinition: ["InsightRepositoryScope", "RepositorySearchScope"],
    InsightTimeScope: ["InsightIntervalTimeScope"],
    MonitorAction: ["MonitorEmail", "MonitorSlackWebhook", "MonitorWebhook"],
    MonitorTrigger: ["MonitorQuery"],
    Namespace: ["Org", "User"],
    Node: [
      "AccessRequest",
      "AccessToken",
      "BackgroundJob",
      "BatchChange",
      "BatchChangesCredential",
      "BatchSpec",
      "BatchSpecWorkspaceFile",
      "BulkOperation",
      "ChangesetEvent",
      "CodeGraphData",
      "CodeHost",
      "CodeIntelligenceConfigurationPolicy",
      "CodeownersIngestedFile",
      "Executor",
      "ExecutorSecret",
      "ExecutorSecretAccessLog",
      "ExternalAccount",
      "ExternalChangeset",
      "ExternalService",
      "ExternalServiceSyncJob",
      "GitCommit",
      "GitHubApp",
      "GitRef",
      "GitserverInstance",
      "HiddenBatchSpecWorkspace",
      "HiddenChangesetSpec",
      "HiddenExternalChangeset",
      "IndexedSearchInstance",
      "InsightView",
      "InsightsDashboard",
      "Monitor",
      "MonitorActionEvent",
      "MonitorEmail",
      "MonitorQuery",
      "MonitorSlackWebhook",
      "MonitorTriggerEvent",
      "MonitorWebhook",
      "Notebook",
      "Org",
      "OrganizationInvitation",
      "OutOfBandMigration",
      "OutboundRequest",
      "OutboundWebhook",
      "Permission",
      "PermissionsSyncJob",
      "PreciseIndex",
      "Prompt",
      "RepoEmbeddingJob",
      "Repository",
      "Role",
      "SavedSearch",
      "SearchContext",
      "SearchJob",
      "SiteConfigurationChange",
      "Team",
      "User",
      "VisibleBatchSpecWorkspace",
      "VisibleChangesetSpec",
      "Webhook",
      "WebhookLog",
    ],
    NotebookBlock: ["FileBlock", "MarkdownBlock", "QueryBlock", "SymbolBlock"],
    Ownable: ["GitBlob"],
    Owner: ["Person", "Team"],
    OwnershipReason: [
      "AssignedOwner",
      "CodeownersFileEntry",
      "RecentContributorOwnershipSignal",
      "RecentViewOwnershipSignal",
    ],
    PackageRepoOrVersionConnection: ["PackageRepoReferenceConnection", "PackageRepoReferenceVersionConnection"],
    PermissionsSyncJobSubject: ["Repository", "User"],
    RepositoryComparisonInterface: ["PreviewRepositoryComparison", "RepositoryComparison"],
    RepositoryRedirect: ["Redirect", "Repository"],
    SearchAggregationResult: [
      "ExhaustiveSearchAggregationResult",
      "NonExhaustiveSearchAggregationResult",
      "SearchAggregationNotAvailable",
    ],
    SearchResult: ["CommitSearchResult", "FileMatch", "Repository"],
    SettingsSubject: ["DefaultSettings", "Org", "Site", "User"],
    StatusMessage: [
      "CloningProgress",
      "ExternalServiceSyncError",
      "GitUpdatesDisabled",
      "GitserverDiskThresholdReached",
      "IndexingProgress",
      "NoRepositoriesDetected",
      "SyncError",
    ],
    TeamMember: ["User"],
    TreeEntry: ["GitBlob", "GitTree"],
    TreeEntryLSIFData: ["GitBlobLSIFData", "GitTreeLSIFData"],
    Viewer: ["User", "Visitor"],
    VisibleApplyPreviewTargets: [
      "VisibleApplyPreviewTargetsAttach",
      "VisibleApplyPreviewTargetsDetach",
      "VisibleApplyPreviewTargetsUpdate",
    ],
    WebhookLogMessage: ["WebhookLogRequest", "WebhookLogResponse"],
  },
};
export default result;
