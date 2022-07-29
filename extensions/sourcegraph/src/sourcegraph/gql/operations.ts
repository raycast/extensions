import { gql } from "@apollo/client";
import * as Apollo from "@apollo/client";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** An arbitrarily large integer encoded as a decimal string. */
  BigInt: any;
  /**
   * An RFC 3339-encoded UTC date string, such as 1973-11-29T21:33:09Z. This value can be parsed into a
   * JavaScript Date using Date.parse. To produce this value from a JavaScript Date instance, use
   * Date#toISOString.
   */
  DateTime: any;
  /** A Git object ID (SHA-1 hash, 40 hexadecimal characters). */
  GitObjectID: any;
  /** A string that contains valid JSON, with additional support for //-style comments and trailing commas. */
  JSONCString: any;
  /** A valid JSON value. */
  JSONValue: any;
  /** A quadruple that represents all possible states of the published value: true, false, 'draft', or null. */
  PublishedValue: any;
};

/** A new external service. */
export type AddExternalServiceInput = {
  /** The JSON configuration of the external service. */
  config: Scalars["String"];
  /** The display name of the external service. */
  displayName: Scalars["String"];
  /** The kind of the external service. */
  kind: ExternalServiceKind;
  /**
   * The namespace this external service belongs to.
   * This can be used both for a user and an organization.
   */
  namespace?: InputMaybe<Scalars["ID"]>;
};

/** Input object for adding insight view to dashboard. */
export type AddInsightViewToDashboardInput = {
  /** ID of the dashboard. */
  dashboardId: Scalars["ID"];
  /** ID of the insight view to attach to the dashboard */
  insightViewId: Scalars["ID"];
};

/** The possible types of alerts (Alert.type values). */
export enum AlertType {
  Error = "ERROR",
  Info = "INFO",
  Warning = "WARNING",
}

/** Denotes the type of operation of a given log entry. */
export enum AuditLogOperation {
  /** Denotes this log entry represents an INSERT query. */
  Create = "CREATE",
  /** Denotes this log entry represents an UPDATE query. */
  Modify = "MODIFY",
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
  /** Bulk merge changesets. */
  Merge = "MERGE",
  /** Bulk publish changesets. */
  Publish = "PUBLISH",
  /** Bulk reenqueue failed changesets. */
  Reenqueue = "REENQUEUE",
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
  changesetSpec: Scalars["ID"];
  /** The desired publication state. */
  publicationState: Scalars["PublishedValue"];
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
   * The changeset reconciler ran into a problem while processing the
   * changeset and will retry it for a number of retries.
   */
  Retrying = "RETRYING",
  /** The changeset is scheduled, and will be enqueued when its turn comes in Sourcegraph's rollout window. */
  Scheduled = "SCHEDULED",
  /** The changeset has not been marked as to be published. */
  Unpublished = "UNPUBLISHED",
}

/**
 * DEPRECATED: This type was renamed to SettingsEdit.
 * NOTE: GraphQL does not support @deprecated directives on INPUT_FIELD_DEFINITION (input fields).
 */
export type ConfigurationEdit = {
  /** DEPRECATED */
  keyPath: Array<KeyPathSegment>;
  /** DEPRECATED */
  value?: InputMaybe<Scalars["JSONValue"]>;
  /** DEPRECATED */
  valueIsJSONCEncodedString?: InputMaybe<Scalars["Boolean"]>;
};

/** CreateFileBlockInput contains the information necessary to create a file block. */
export type CreateFileBlockInput = {
  /** Path within the repository, e.g. "client/web/file.tsx". */
  filePath: Scalars["String"];
  /** An optional line range. If omitted, we display the entire file. */
  lineRange?: InputMaybe<CreateFileBlockLineRangeInput>;
  /** Name of the repository, e.g. "github.com/sourcegraph/sourcegraph". */
  repositoryName: Scalars["String"];
  /**
   * An optional revision, e.g. "pr/feature-1", "a9505a2947d3df53558e8c88ff8bcef390fc4e3e".
   * If omitted, we use the latest revision (HEAD).
   */
  revision?: InputMaybe<Scalars["String"]>;
};

/** Input to create a line range for a file block. */
export type CreateFileBlockLineRangeInput = {
  /** The last line to fetch (0-indexed, exclusive). */
  endLine: Scalars["Int"];
  /** The first line to fetch (0-indexed, inclusive). */
  startLine: Scalars["Int"];
};

/** Input object for creating a new dashboard. */
export type CreateInsightsDashboardInput = {
  /** Permissions to grant to the dashboard. */
  grants: InsightsPermissionGrantsInput;
  /** Dashboard title. */
  title: Scalars["String"];
};

/**
 * GraphQL does not accept union types as inputs, so we have to use
 * all possible optional inputs with an enum to select the actual block input we want to use.
 */
export type CreateNotebookBlockInput = {
  /** Compute input. */
  computeInput?: InputMaybe<Scalars["String"]>;
  /** File input. */
  fileInput?: InputMaybe<CreateFileBlockInput>;
  /** ID of the block. */
  id: Scalars["String"];
  /** Markdown input. */
  markdownInput?: InputMaybe<Scalars["String"]>;
  /** Query input. */
  queryInput?: InputMaybe<Scalars["String"]>;
  /** Symbol input. */
  symbolInput?: InputMaybe<CreateSymbolBlockInput>;
  /** Block type. */
  type: NotebookBlockType;
};

/** CreateSymbolBlockInput contains the information necessary to create a symbol block. */
export type CreateSymbolBlockInput = {
  /** Path within the repository, e.g. "client/web/file.tsx". */
  filePath: Scalars["String"];
  /** Number of lines to show before and after the matched symbol line. */
  lineContext: Scalars["Int"];
  /** Name of the repository, e.g. "github.com/sourcegraph/sourcegraph". */
  repositoryName: Scalars["String"];
  /**
   * An optional revision, e.g. "pr/feature-1", "a9505a2947d3df53558e8c88ff8bcef390fc4e3e".
   * If omitted, we use the latest revision (HEAD).
   */
  revision?: InputMaybe<Scalars["String"]>;
  /** Name of the symbol container. */
  symbolContainerName: Scalars["String"];
  /** The symbol kind. */
  symbolKind: SymbolKind;
  /** The symbol name. */
  symbolName: Scalars["String"];
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
  argument?: InputMaybe<Scalars["String"]>;
  /**
   * An optional cohort ID to identify the user as part of a specific A/B test.
   * The cohort ID is expected to be a date in the form YYYY-MM-DD
   */
  cohortID?: InputMaybe<Scalars["String"]>;
  /** Device ID used for Amplitude analytics. Used on Sourcegraph Cloud only. */
  deviceID?: InputMaybe<Scalars["String"]>;
  /** The name of the event. */
  event: Scalars["String"];
  /**
   * Event ID used to deduplicate events that occur simultaneously in Amplitude analytics.
   * See https://developers.amplitude.com/docs/http-api-v2#optional-keys. Used on Sourcegraph Cloud only.
   */
  eventID?: InputMaybe<Scalars["Int"]>;
  /** The first sourcegraph URL visited by the user, stored in a browser cookie. */
  firstSourceURL?: InputMaybe<Scalars["String"]>;
  /**
   * Insert ID used to deduplicate events that re-occur in the event of retries or
   * backfills in Amplitude analytics. See https://developers.amplitude.com/docs/http-api-v2#optional-keys.
   * Used on Sourcegraph Cloud only.
   */
  insertID?: InputMaybe<Scalars["String"]>;
  /** The last sourcegraph URL visited by the user, stored in a browser cookie. */
  lastSourceURL?: InputMaybe<Scalars["String"]>;
  /**
   * Public argument information. PRIVACY: Do NOT include any potentially private information in this field.
   * These properties get sent to our analytics tools for Cloud, so must not include private information,
   * such as search queries or repository names.
   */
  publicArgument?: InputMaybe<Scalars["String"]>;
  /**
   * An optional referrer parameter for the user's current session.
   * Only captured and stored on Sourcegraph Cloud.
   */
  referrer?: InputMaybe<Scalars["String"]>;
  /** The source of the event. */
  source: EventSource;
  /** The URL when the event was logged. */
  url: Scalars["String"];
  /** The randomly generated unique user ID stored in a browser cookie. */
  userCookieID: Scalars["String"];
};

/** The product sources where events can come from. */
export enum EventSource {
  Backend = "BACKEND",
  Codehostintegration = "CODEHOSTINTEGRATION",
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

/** A specific kind of external service. */
export enum ExternalServiceKind {
  Awscodecommit = "AWSCODECOMMIT",
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
  Rustpackages = "RUSTPACKAGES",
}

/** Additional options when performing a permissions sync. */
export type FetchPermissionsOptions = {
  /**
   * Indicate that any caches added for optimization encountered during this permissions
   * sync should be invalidated.
   */
  invalidateCaches?: InputMaybe<Scalars["Boolean"]>;
};

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

/** Ordering options for Git refs. */
export enum GitRefOrder {
  /** By the authored or committed at date, whichever is more recent. */
  AuthoredOrCommittedAt = "AUTHORED_OR_COMMITTED_AT",
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
  currentPath?: InputMaybe<Scalars["String"]>;
  /** The answer to "What's going well? What could be better?". */
  feedback?: InputMaybe<Scalars["String"]>;
  /** User's happiness rating, from 1-4. */
  score: Scalars["Int"];
};

/** A specific highlighted line range to fetch. */
export type HighlightLineRange = {
  /**
   * The last line to fetch (0-indexed, inclusive). Values outside the bounds of the file will
   * automatically be clamped within the valid range.
   */
  endLine: Scalars["Int"];
  /**
   * The first line to fetch (0-indexed, inclusive). Values outside the bounds of the file will
   * automatically be clamped within the valid range.
   */
  startLine: Scalars["Int"];
};

/** Denotes the confidence in the correctness of the proposed index target. */
export enum InferedPreciseSupportLevel {
  /**
   * An auto-indexing job configuration was able to be infered for this
   * directory that has a high likelyhood of being complete enough to result
   * in an LSIF index.
   */
  IndexJobInfered = "INDEX_JOB_INFERED",
  /**
   * The language is known to have an LSIF indexer associated with it
   * but this may not be the directory from which it should be invoked.
   * Relevant build tool configuration may be available at a parent directory.
   */
  LanguageSupported = "LANGUAGE_SUPPORTED",
  /**
   * Relevant build tool configuration files were located that indicate
   * a good possibility of this directory being where an LSIF indexer
   * could be invoked, however we have or can not infer a potentially complete
   * auto indexing job configuration.
   */
  ProjectStructureSupported = "PROJECT_STRUCTURE_SUPPORTED",
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
  excludeRepoRegex?: InputMaybe<Scalars["String"]>;
  /** A regex string for which to include repositories in a filter. */
  includeRepoRegex?: InputMaybe<Scalars["String"]>;
  /** A list of query based search contexts to include in the filters for the view. */
  searchContexts?: InputMaybe<Array<Scalars["String"]>>;
};

/** Input object for permissions to grant. */
export type InsightsPermissionGrantsInput = {
  /** Set global to true to grant global permission. */
  global?: InputMaybe<Scalars["Boolean"]>;
  /** Organizations to grant permissions to. */
  organizations?: InputMaybe<Array<Scalars["ID"]>>;
  /** Specific users to grant permissions to. */
  users?: InputMaybe<Array<Scalars["ID"]>>;
};

/**
 * A segment of a key path that locates a nested JSON value in a root JSON value. Exactly one field in each
 * KeyPathSegment must be non-null.
 * For example, in {"a": [0, {"b": 3}]}, the value 3 is located at the key path ["a", 1, "b"].
 */
export type KeyPathSegment = {
  /** The index of the array at this location to descend into. */
  index?: InputMaybe<Scalars["Int"]>;
  /** The name of the property in the object at this location to descend into. */
  property?: InputMaybe<Scalars["String"]>;
};

/** The state an LSIF index can be in. */
export enum LsifIndexState {
  /** This index was processed successfully. */
  Completed = "COMPLETED",
  /** This index failed to be processed. */
  Errored = "ERRORED",
  /** This index is being processed. */
  Processing = "PROCESSING",
  /** This index is queued to be processed later. */
  Queued = "QUEUED",
}

/** The state an LSIF upload can be in. */
export enum LsifUploadState {
  /** This upload was processed successfully. */
  Completed = "COMPLETED",
  /**
   * This upload is queued for deletion. This upload was previously in the
   * COMPLETED state and evicted, replaced by a newer upload, or deleted by
   * a user. This upload is able to answer code intelligence queries until
   * the commit graph of the upload's repository is next calculated, at which
   * point the upload will become unreachable.
   */
  Deleting = "DELETING",
  /** This upload failed to be processed. */
  Errored = "ERRORED",
  /** This upload is being processed. */
  Processing = "PROCESSING",
  /** This upload is queued to be processed later. */
  Queued = "QUEUED",
  /** This upload is currently being transferred to Sourcegraph. */
  Uploading = "UPLOADING",
}

/** Options for a line chart data series */
export type LineChartDataSeriesOptionsInput = {
  /** The label for the data series. */
  label?: InputMaybe<Scalars["String"]>;
  /** The line color for the data series. */
  lineColor?: InputMaybe<Scalars["String"]>;
};

/** Options for a line chart */
export type LineChartOptionsInput = {
  /** The chart title. */
  title?: InputMaybe<Scalars["String"]>;
};

/** Input for a line chart search insight data series. */
export type LineChartSearchInsightDataSeriesInput = {
  /** Whether or not to generate the timeseries results from the query capture groups. Defaults to false if not provided. */
  generatedFromCaptureGroups?: InputMaybe<Scalars["Boolean"]>;
  /** The field to group results by. (For compute powered insights only.) This field is experimental and should be considered unstable in the API. */
  groupBy?: InputMaybe<GroupByField>;
  /** Options for this line chart data series. */
  options: LineChartDataSeriesOptionsInput;
  /** The query string. */
  query: Scalars["String"];
  /** The scope of repositories. */
  repositoryScope: RepositoryScopeInput;
  /** Unique ID for the series. Omit this field if it's a new series. */
  seriesId?: InputMaybe<Scalars["String"]>;
  /** The scope of time. */
  timeScope: TimeScopeInput;
};

/** Input for a line chart search insight. */
export type LineChartSearchInsightInput = {
  /** The dashboard IDs to associate this insight with once created. */
  dashboards?: InputMaybe<Array<Scalars["ID"]>>;
  /** The list of data series to create (or add) to this insight. */
  dataSeries: Array<LineChartSearchInsightDataSeriesInput>;
  /** The options for this line chart. */
  options: LineChartOptionsInput;
  /** The default values for filters and aggregates for this line chart. */
  viewControls?: InputMaybe<InsightViewControlsInput>;
};

/** Describes options for rendering Markdown. */
export type MarkdownOptions = {
  /** A dummy null value (empty input types are not allowed yet). */
  alwaysNil?: InputMaybe<Scalars["String"]>;
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
  id?: InputMaybe<Scalars["ID"]>;
  /** The desired state after the update. */
  update: MonitorEmailInput;
};

/** The input required to edit a code monitor. */
export type MonitorEditInput = {
  /** The id of the monitor. */
  id: Scalars["ID"];
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
  id?: InputMaybe<Scalars["ID"]>;
  /** The desired state after the update. */
  update: MonitorSlackWebhookInput;
};

/** The input required to edit a trigger. */
export type MonitorEditTriggerInput = {
  /** The id of the Trigger. */
  id: Scalars["ID"];
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
  id?: InputMaybe<Scalars["ID"]>;
  /** The desired state after the update. */
  update: MonitorWebhookInput;
};

/** The input required to create an email action. */
export type MonitorEmailInput = {
  /** Whether the email action is enabled or not. */
  enabled: Scalars["Boolean"];
  /** Use header to automatically approve the message in a read-only or moderated mailing list. */
  header: Scalars["String"];
  /** Whether to include the result contents in the email message */
  includeResults: Scalars["Boolean"];
  /** The priority of the email. */
  priority: MonitorEmailPriority;
  /** A list of users or orgs which will receive the email. */
  recipients: Array<Scalars["ID"]>;
};

/** The priority of an email action. */
export enum MonitorEmailPriority {
  Critical = "CRITICAL",
  Normal = "NORMAL",
}

/** The input required to create a code monitor. */
export type MonitorInput = {
  /** A meaningful description of the code monitor. */
  description: Scalars["String"];
  /** Whether the code monitor is enabled or not. */
  enabled: Scalars["Boolean"];
  /**
   * The namespace represents the owner of the code monitor.
   * Owners can either be users or organizations.
   */
  namespace: Scalars["ID"];
};

/** The input required to create a Slack webhook action. */
export type MonitorSlackWebhookInput = {
  /** Whether the Slack webhook action is enabled or not. */
  enabled: Scalars["Boolean"];
  /** Whether to include the result contents in Slack notification message. */
  includeResults: Scalars["Boolean"];
  /** The URL that will receive a payload when the action is triggered. */
  url: Scalars["String"];
};

/** The input required to create a trigger. */
export type MonitorTriggerInput = {
  /** The query string. */
  query: Scalars["String"];
};

/** The input required to create a webhook action. */
export type MonitorWebhookInput = {
  /** Whether the webhook action is enabled or not. */
  enabled: Scalars["Boolean"];
  /** Whether to include the result contents in webhook payload. */
  includeResults: Scalars["Boolean"];
  /** The URL that will receive a payload when the action is triggered. */
  url: Scalars["String"];
};

/** Enum of possible block types. */
export enum NotebookBlockType {
  Compute = "COMPUTE",
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
  namespace: Scalars["ID"];
  /**
   * Public property controls the visibility of the notebook. A public notebook is available to
   * any user on the instance. Private notebooks are only available to their creators.
   */
  public: Scalars["Boolean"];
  /** The title of the notebook. */
  title: Scalars["String"];
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

/** Options for a pie chart */
export type PieChartOptionsInput = {
  /**
   * The threshold for which groups fall into the "other category". Only categories with a percentage greater than
   * this value will be separately rendered.
   */
  otherThreshold: Scalars["Float"];
  /** The title for the pie chart. */
  title: Scalars["String"];
};

/** Input for a pie chart search insight */
export type PieChartSearchInsightInput = {
  /** The dashboard IDs to associate this insight with once created. */
  dashboards?: InputMaybe<Array<Scalars["ID"]>>;
  /** Options for this pie chart. */
  presentationOptions: PieChartOptionsInput;
  /** The query string. */
  query: Scalars["String"];
  /** The scope of repositories. */
  repositoryScope: RepositoryScopeInput;
};

/** Ownership level of the recommended precise code-intel indexer. */
export enum PreciseSupportLevel {
  /** When the recommended indexer is maintained by us. */
  Native = "NATIVE",
  /**
   * When the recommended indexer is maintained by a third-party
   * but is recommended over a native indexer, where one exists.
   */
  ThirdParty = "THIRD_PARTY",
  /** When there is no known indexer. */
  Unknown = "UNKNOWN",
}

/**
 * An input type that describes a product license to be generated and signed.
 * FOR INTERNAL USE ONLY.
 */
export type ProductLicenseInput = {
  /** The expiration date of this product license, expressed as the number of seconds since the epoch. */
  expiresAt: Scalars["Int"];
  /** The tags that indicate which features are activated by this license. */
  tags: Array<Scalars["String"]>;
  /** The number of users for which this product subscription is valid. */
  userCount: Scalars["Int"];
};

/**
 * An input type that describes a product subscription to be purchased. Corresponds to
 * ProductSubscriptionInvoiceItem.
 * FOR INTERNAL USE ONLY.
 */
export type ProductSubscriptionInput = {
  /**
   * The billing plan ID for the subscription (ProductPlan.billingPlanID). This also specifies the
   * billing product, because a plan is associated with its product in the billing system.
   */
  billingPlanID: Scalars["String"];
  /** This subscription's user count. */
  userCount: Scalars["Int"];
};

/** Input object for adding insight view to dashboard. */
export type RemoveInsightViewFromDashboardInput = {
  /** ID of the dashboard. */
  dashboardId: Scalars["ID"];
  /** ID of the insight view to remove from the dashboard */
  insightViewId: Scalars["ID"];
};

/** RepositoryOrderBy enumerates the ways a repositories list can be ordered. */
export enum RepositoryOrderBy {
  /** deprecated (use the equivalent REPOSITORY_CREATED_AT) */
  RepositoryCreatedAt = "REPOSITORY_CREATED_AT",
  RepositoryName = "REPOSITORY_NAME",
  RepoCreatedAt = "REPO_CREATED_AT",
}

/** Different repository permission levels. */
export enum RepositoryPermission {
  Read = "READ",
}

/** A custom repository scope for an insight data series. */
export type RepositoryScopeInput = {
  /** The list of repositories included in this scope. */
  repositories: Array<Scalars["String"]>;
};

/**
 * Tiered list of types of search-based support for a language. This may be expanded as different
 * indexing methods are introduced.
 */
export enum SearchBasedSupportLevel {
  /** Universal-ctags is used for indexing this language. */
  Basic = "BASIC",
  /** The language has no configured search-based code-intel support. */
  Unsupported = "UNSUPPORTED",
}

/** Input for editing an existing search context. */
export type SearchContextEditInput = {
  /** Search context description. */
  description: Scalars["String"];
  /**
   * Search context name. Not the same as the search context spec. Search context namespace and search context name
   * are used to construct the fully-qualified search context spec.
   * Example mappings from search context spec to search context name: global -> global, @user -> user, @org -> org,
   * @user/ctx1 -> ctx1, @org/ctxs/ctx -> ctxs/ctx.
   */
  name: Scalars["String"];
  /**
   * Public property controls the visibility of the search context. Public search context is available to
   * any user on the instance. If a public search context contains private repositories, those are filtered out
   * for unauthorized users. Private search contexts are only available to their owners. Private user search context
   * is available only to the user, private org search context is available only to the members of the org, and private
   * instance-level search contexts are available only to site-admins.
   */
  public: Scalars["Boolean"];
  /**
   * Sourcegraph search query that defines the search context.
   * e.g. "r:^github\.com/org (rev:bar or rev:HEAD) file:^sub/dir"
   */
  query: Scalars["String"];
};

/** Input for a new search context. */
export type SearchContextInput = {
  /** Search context description. */
  description: Scalars["String"];
  /**
   * Search context name. Not the same as the search context spec. Search context namespace and search context name
   * are used to construct the fully-qualified search context spec.
   * Example mappings from search context spec to search context name: global -> global, @user -> user, @org -> org,
   * @user/ctx1 -> ctx1, @org/ctxs/ctx -> ctxs/ctx.
   */
  name: Scalars["String"];
  /** Namespace of the search context (user or org). If not set, search context is considered instance-level. */
  namespace?: InputMaybe<Scalars["ID"]>;
  /**
   * Public property controls the visibility of the search context. Public search context is available to
   * any user on the instance. If a public search context contains private repositories, those are filtered out
   * for unauthorized users. Private search contexts are only available to their owners. Private user search context
   * is available only to the user, private org search context is available only to the members of the org, and private
   * instance-level search contexts are available only to site-admins.
   */
  public: Scalars["Boolean"];
  /**
   * Sourcegraph search query that defines the search context.
   * e.g. "r:^github\.com/org (rev:bar or rev:HEAD) file:^sub/dir"
   */
  query: Scalars["String"];
};

/** Input for a set of revisions to be searched within a repository. */
export type SearchContextRepositoryRevisionsInput = {
  /** ID of the repository to be searched. */
  repositoryID: Scalars["ID"];
  /** Revisions in the repository to be searched. */
  revisions: Array<Scalars["String"]>;
};

/** SearchContextsOrderBy enumerates the ways a search contexts list can be ordered. */
export enum SearchContextsOrderBy {
  SearchContextSpec = "SEARCH_CONTEXT_SPEC",
  SearchContextUpdatedAt = "SEARCH_CONTEXT_UPDATED_AT",
}

/** Required input to generate a time series for a search insight using live preview. */
export type SearchInsightLivePreviewInput = {
  /** Whether or not to generate the timeseries results from the query capture groups. */
  generatedFromCaptureGroups: Scalars["Boolean"];
  /** The desired label for the series. Will be overwritten when series are dynamically generated. */
  label: Scalars["String"];
  /** The query string. */
  query: Scalars["String"];
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

/** The search pattern type. */
export enum SearchPatternType {
  Literal = "literal",
  Lucky = "lucky",
  Regexp = "regexp",
  Standard = "standard",
  Structural = "structural",
}

/** Required input to generate a live preview for a series. */
export type SearchSeriesPreviewInput = {
  /** Whether or not to generate the timeseries results from the query capture groups. */
  generatedFromCaptureGroups: Scalars["Boolean"];
  /** The desired label for the series. Will be overwritten when series are dynamically generated. */
  label: Scalars["String"];
  /** The query string. */
  query: Scalars["String"];
};

/** The version of the search syntax. */
export enum SearchVersion {
  /** Search syntax that defaults to regexp search. */
  V1 = "V1",
  /** Search syntax that defaults to literal search. */
  V2 = "V2",
}

/** Input type for series display options. */
export type SeriesDisplayOptionsInput = {
  /** Max number of series to return. */
  limit?: InputMaybe<Scalars["Int"]>;
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
  value?: InputMaybe<Scalars["JSONValue"]>;
  /**
   * Whether to treat the value as a JSONC-encoded string, which makes it possible to perform an edit that
   * preserves (or adds/removes) comments.
   */
  valueIsJSONCEncodedString?: InputMaybe<Scalars["Boolean"]>;
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
  lastID?: InputMaybe<Scalars["Int"]>;
  /** The subject whose settings to mutate (organization, user, etc.). */
  subject: Scalars["ID"];
};

/** Input for a user satisfaction (NPS) survey submission. */
export type SurveySubmissionInput = {
  /** The answer to "What would make Sourcegraph better?" */
  better?: InputMaybe<Scalars["String"]>;
  /**
   * User-provided email address, if there is no currently authenticated user. If there is, this value
   * will not be used.
   */
  email?: InputMaybe<Scalars["String"]>;
  /** The answer to "What else do you use Sourcegraph to do?". */
  otherUseCase?: InputMaybe<Scalars["String"]>;
  /** User's likelihood of recommending Sourcegraph to a friend, from 0-10. */
  score: Scalars["Int"];
  /** The answer to "You use Sourcegraph to...". */
  useCases?: InputMaybe<Array<SurveyUseCase>>;
};

/** Possible answers to "You use Sourcegraph to..." in the NPS Survey. */
export enum SurveyUseCase {
  FixSecurityVulnerabilities = "FIX_SECURITY_VULNERABILITIES",
  ImproveCodeQuality = "IMPROVE_CODE_QUALITY",
  RespondToIncidents = "RESPOND_TO_INCIDENTS",
  ReuseCode = "REUSE_CODE",
  UnderstandNewCode = "UNDERSTAND_NEW_CODE",
}

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

/** A time scope defined using a time interval (ex. 5 days) */
export type TimeIntervalStepInput = {
  /** The time unit for the interval. */
  unit: TimeIntervalStepUnit;
  /** The value for the interval. */
  value: Scalars["Int"];
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
  config?: InputMaybe<Scalars["String"]>;
  /** The updated display name, if provided. */
  displayName?: InputMaybe<Scalars["String"]>;
  /** The id of the external service to update. */
  id: Scalars["ID"];
};

/** Input object for update insight series mutation. */
export type UpdateInsightSeriesInput = {
  /** The desired activity state (enabled or disabled) for the series. */
  enabled?: InputMaybe<Scalars["Boolean"]>;
  /** Unique ID for the series. */
  seriesId: Scalars["String"];
};

/** Input object for updating a dashboard. */
export type UpdateInsightsDashboardInput = {
  /** Permissions to grant to the dashboard. */
  grants?: InputMaybe<InsightsPermissionGrantsInput>;
  /** Dashboard title. */
  title?: InputMaybe<Scalars["String"]>;
};

/** Input for updating a line chart search insight. */
export type UpdateLineChartSearchInsightInput = {
  /** The complete list of data series on this line chart. Note: excluding a data series will remove it. */
  dataSeries: Array<LineChartSearchInsightDataSeriesInput>;
  /** The presentation options for this line chart. */
  presentationOptions: LineChartOptionsInput;
  /** The default values for filters and aggregates for this line chart. */
  viewControls: InsightViewControlsInput;
};

/** Input for updating a pie chart search insight */
export type UpdatePieChartSearchInsightInput = {
  /** Options for this pie chart. */
  presentationOptions: PieChartOptionsInput;
  /** The query string. */
  query: Scalars["String"];
  /** The scope of repositories. */
  repositoryScope: RepositoryScopeInput;
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
  bindID: Scalars["String"];
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
  bindID: Scalars["String"];
  /** An array of paths that the user is not allowed to access, in glob format. */
  pathExcludes: Array<Scalars["String"]>;
  /** An array of paths that the user is allowed to access, in glob format. */
  pathIncludes: Array<Scalars["String"]>;
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
  batchChange: Scalars["ID"];
  changeset: Scalars["ID"];
}>;

export type PublishChangesetMutation = {
  __typename?: "Mutation";
  publishChangesets: { __typename?: "BulkOperation"; id: string };
};

export type ReenqueueChangesetMutationVariables = Exact<{
  changeset: Scalars["ID"];
}>;

export type ReenqueueChangesetMutation = {
  __typename?: "Mutation";
  reenqueueChangeset:
    | { __typename?: "ExternalChangeset"; id: string }
    | { __typename?: "HiddenExternalChangeset"; id: string };
};

export type MergeChangesetMutationVariables = Exact<{
  batchChange: Scalars["ID"];
  changeset: Scalars["ID"];
  squash?: InputMaybe<Scalars["Boolean"]>;
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
  namespace: Scalars["ID"];
  name: Scalars["String"];
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
  repo: Scalars["String"];
  rev: Scalars["String"];
  path: Scalars["String"];
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
    | { __typename: "ComputeBlock" }
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
  query: Scalars["String"];
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
        | { __typename: "ComputeBlock" }
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
  baseOptions?: Apollo.MutationHookOptions<PublishChangesetMutation, PublishChangesetMutationVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<PublishChangesetMutation, PublishChangesetMutationVariables>(
    PublishChangesetDocument,
    options
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
  baseOptions?: Apollo.MutationHookOptions<ReenqueueChangesetMutation, ReenqueueChangesetMutationVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<ReenqueueChangesetMutation, ReenqueueChangesetMutationVariables>(
    ReenqueueChangesetDocument,
    options
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
  baseOptions?: Apollo.MutationHookOptions<MergeChangesetMutation, MergeChangesetMutationVariables>
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
    batchChanges(first: 100) {
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
  baseOptions?: Apollo.QueryHookOptions<GetBatchChangesQuery, GetBatchChangesQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetBatchChangesQuery, GetBatchChangesQueryVariables>(GetBatchChangesDocument, options);
}
export function useGetBatchChangesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetBatchChangesQuery, GetBatchChangesQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetBatchChangesQuery, GetBatchChangesQueryVariables>(GetBatchChangesDocument, options);
}
export type GetBatchChangesQueryHookResult = ReturnType<typeof useGetBatchChangesQuery>;
export type GetBatchChangesLazyQueryHookResult = ReturnType<typeof useGetBatchChangesLazyQuery>;
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
  baseOptions: Apollo.QueryHookOptions<GetChangesetsQuery, GetChangesetsQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetChangesetsQuery, GetChangesetsQueryVariables>(GetChangesetsDocument, options);
}
export function useGetChangesetsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetChangesetsQuery, GetChangesetsQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetChangesetsQuery, GetChangesetsQueryVariables>(GetChangesetsDocument, options);
}
export type GetChangesetsQueryHookResult = ReturnType<typeof useGetChangesetsQuery>;
export type GetChangesetsLazyQueryHookResult = ReturnType<typeof useGetChangesetsLazyQuery>;
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
  baseOptions: Apollo.QueryHookOptions<GetFileContentsQuery, GetFileContentsQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetFileContentsQuery, GetFileContentsQueryVariables>(GetFileContentsDocument, options);
}
export function useGetFileContentsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetFileContentsQuery, GetFileContentsQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetFileContentsQuery, GetFileContentsQueryVariables>(GetFileContentsDocument, options);
}
export type GetFileContentsQueryHookResult = ReturnType<typeof useGetFileContentsQuery>;
export type GetFileContentsLazyQueryHookResult = ReturnType<typeof useGetFileContentsLazyQuery>;
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
  baseOptions: Apollo.QueryHookOptions<GetNotebooksQuery, GetNotebooksQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetNotebooksQuery, GetNotebooksQueryVariables>(GetNotebooksDocument, options);
}
export function useGetNotebooksLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<GetNotebooksQuery, GetNotebooksQueryVariables>
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetNotebooksQuery, GetNotebooksQueryVariables>(GetNotebooksDocument, options);
}
export type GetNotebooksQueryHookResult = ReturnType<typeof useGetNotebooksQuery>;
export type GetNotebooksLazyQueryHookResult = ReturnType<typeof useGetNotebooksLazyQuery>;
export type GetNotebooksQueryResult = Apollo.QueryResult<GetNotebooksQuery, GetNotebooksQueryVariables>;

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
    ComputeResult: ["ComputeMatchContext", "ComputeText"],
    FeatureFlag: ["FeatureFlagBoolean", "FeatureFlagRollout"],
    File2: ["GitBlob", "VirtualFile"],
    GenericSearchResultInterface: ["CommitSearchResult", "Repository"],
    GitRevSpec: ["GitObject", "GitRef", "GitRevSpecExpr"],
    GitTreeOrBlob: ["GitBlob", "GitTree"],
    HiddenApplyPreviewTargets: [
      "HiddenApplyPreviewTargetsAttach",
      "HiddenApplyPreviewTargetsDetach",
      "HiddenApplyPreviewTargetsUpdate",
    ],
    InsightDataSeriesDefinition: ["SearchInsightDataSeriesDefinition"],
    InsightPresentation: ["LineChartInsightViewPresentation", "PieChartInsightViewPresentation"],
    InsightTimeScope: ["InsightIntervalTimeScope"],
    MonitorAction: ["MonitorEmail", "MonitorSlackWebhook", "MonitorWebhook"],
    MonitorTrigger: ["MonitorQuery"],
    Namespace: ["Org", "User"],
    Node: [
      "AccessToken",
      "BatchChange",
      "BatchChangesCredential",
      "BatchSpec",
      "BulkOperation",
      "ChangesetEvent",
      "CodeIntelligenceConfigurationPolicy",
      "Executor",
      "ExternalAccount",
      "ExternalChangeset",
      "ExternalService",
      "GitCommit",
      "GitRef",
      "HiddenBatchSpecWorkspace",
      "HiddenChangesetSpec",
      "HiddenExternalChangeset",
      "InsightView",
      "InsightsDashboard",
      "LSIFIndex",
      "LSIFUpload",
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
      "ProductLicense",
      "ProductSubscription",
      "RegistryExtension",
      "Repository",
      "SavedSearch",
      "SearchContext",
      "User",
      "VisibleBatchSpecWorkspace",
      "VisibleChangesetSpec",
      "WebhookLog",
    ],
    NotebookBlock: ["ComputeBlock", "FileBlock", "MarkdownBlock", "QueryBlock", "SymbolBlock"],
    RegistryPublisher: ["Org", "User"],
    RepositoryComparisonInterface: ["PreviewRepositoryComparison", "RepositoryComparison"],
    RepositoryRedirect: ["Redirect", "Repository"],
    SearchResult: ["CommitSearchResult", "FileMatch", "Repository"],
    SettingsSubject: ["DefaultSettings", "Org", "Site", "User"],
    StatusMessage: ["CloningProgress", "ExternalServiceSyncError", "IndexingError", "IndexingProgress", "SyncError"],
    TreeEntry: ["GitBlob", "GitTree"],
    TreeEntryLSIFData: ["GitBlobLSIFData", "GitTreeLSIFData"],
    VisibleApplyPreviewTargets: [
      "VisibleApplyPreviewTargetsAttach",
      "VisibleApplyPreviewTargetsDetach",
      "VisibleApplyPreviewTargetsUpdate",
    ],
    WebhookLogMessage: ["WebhookLogRequest", "WebhookLogResponse"],
  },
};
export default result;
