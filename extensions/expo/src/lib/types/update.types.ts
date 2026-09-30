export interface UpdatesByGroupType {
  updatesByGroup: UpdatesByGroupItem[];
}
export interface UpdatesByGroupItem {
  __typename: string;
  id: string;
  insights: Insights;
  manifestFragment: string;
  rolloutPercentage: null;
  rolloutControlUpdate: null;
  deployments: Deployments;
  app: App;
  branch: Branch;
  actor: Actor;
  group: string;
  message: string;
  createdAt: string;
  updatedAt: string;
  activityTimestamp: string;
  isRollBackToEmbedded: boolean;
  codeSigningInfo: null;
  branchId: string;
  updateRuntime: UpdateRuntime;
  updatePlatform: string;
  updateGitCommitHash: string;
  updateIsGitWorkingTreeDirty: boolean;
}
interface Insights {
  __typename: string;
  cumulativeMetrics: CumulativeMetrics;
}
interface CumulativeMetrics {
  __typename: string;
  metricsAtLastTimestamp: MetricsAtLastTimestamp;
  data: Data;
}
interface MetricsAtLastTimestamp {
  __typename: string;
  totalInstalls: number;
  totalFailedInstalls: number;
}
interface Data {
  __typename: string;
  labels?: string[];
  installsDataset?: InstallsDataset;
  failedInstallsDataset?: FailedInstallsDataset;
  pageInfo?: PageInfo;
  edges?: EdgesItem[];
}
interface InstallsDataset {
  __typename: string;
  id: string;
  label: string;
  cumulative: number[];
  difference: number[];
}
interface FailedInstallsDataset {
  __typename: string;
  id: string;
  label: string;
  cumulative: number[];
  difference: number[];
}
interface Deployments {
  __typename: string;
  success: boolean;
  data: Data;
  error: null;
}
interface PageInfo {
  __typename: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
interface EdgesItem {
  __typename: string;
  node: UpdateItem;
  cursor?: string;
}
interface UpdateItem {
  __typename: string;
  id: string;
  runtime: Runtime;
  channel?: Channel;
  latestUpdatesPerBranch?: LatestUpdatesPerBranchItem[];
  finishedBuildCount?: number;
  latestBuild?: LatestBuild;
  platform?: string;
  status?: string;
  app?: App;
  artifacts?: Artifacts;
  distribution?: string;
  logFiles?: any[];
  metrics?: Metrics;
  initiatingActor?: InitiatingActor;
  createdAt?: string;
  enqueuedAt?: string;
  provisioningStartedAt?: string;
  workerStartedAt?: string;
  completedAt?: string;
  updatedAt?: string;
  expirationDate?: string;
  sdkVersion?: string;
  updateChannel?: UpdateChannel;
  buildProfile?: string;
  appVersion?: string;
  appBuildVersion?: string;
  gitCommitHash?: string;
  gitCommitMessage?: string;
  isGitWorkingTreeDirty?: boolean;
  message?: null;
  resourceClassDisplayName?: string;
  gitRef?: null;
  projectRootDirectory?: null;
  githubRepositoryOwnerAndName?: null;
  projectMetadataFileUrl?: string;
  childBuild?: null;
  priority?: string;
  queuePosition?: null;
  initialQueuePosition?: null;
  estimatedWaitTimeLeftSeconds?: null;
  submissions?: any[];
  canRetry?: boolean;
  retryDisabledReason?: string;
  maxRetryTimeMinutes?: number;
  buildMode?: string;
  customWorkflowName?: null;
  isWaived?: boolean;
  developmentClient?: boolean;
  selectedImage?: null;
  customNodeVersion?: null;
  isForIosSimulator?: boolean;
  resolvedEnvironment?: string;
}
interface Runtime {
  __typename: string;
  id: string;
  version: string;
}
interface Channel {
  __typename: string;
  updateBranches: UpdateBranchesItem[];
  id: string;
  name: string;
  branchMapping: string;
  createdAt: string;
  updatedAt: string;
  isPaused: boolean;
}
interface UpdateBranchesItem {
  __typename: string;
  id: string;
  name: string;
}
interface LatestUpdatesPerBranchItem {
  __typename: string;
  branchId: string;
  update: Update;
}
interface Update {
  __typename: string;
  id: string;
  branchId: string;
  group: string;
  message: string;
  createdAt: string;
}
interface LatestBuild {
  __typename: string;
  edges: EdgesItem[];
}
interface App {
  __typename: string;
  id: string;
  fullName: string;
  slug: string;
  name?: string;
  iconUrl?: string;
  githubRepository: GithubRepository;
  ownerAccount: OwnerAccount;
}
interface GithubRepository {
  __typename: string;
  githubRepositoryUrl: string;
}
interface OwnerAccount {
  __typename: string;
  name: string;
  id?: string;
}
interface Artifacts {
  __typename: string;
  applicationArchiveUrl: string;
  buildArtifactsUrl: null;
  xcodeBuildLogsUrl: string;
}
interface Metrics {
  __typename: string;
  buildWaitTime: number;
  buildQueueTime: number;
  buildDuration: number;
}
interface InitiatingActor {
  __typename: string;
  id: string;
  displayName: string;
  username: string;
  fullName: string;
  profilePhoto: string;
}
interface UpdateChannel {
  __typename: string;
  id: string;
  name: string;
}
interface Branch {
  __typename: string;
  id: string;
  name: string;
}
interface Actor {
  __typename: string;
  id: string;
  displayName: string;
  profilePhoto: string;
  fullName: string;
  username: string;
  bestContactEmail: string;
}
interface UpdateRuntime {
  __typename: string;
  id: string;
  version: string;
}
