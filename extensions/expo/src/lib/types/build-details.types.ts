import { ErrorResponse } from "../types";

export type BuildDetailsResponse = BuildDetailsSuccess | ErrorResponse;

type BuildDetailsSuccess = BuildDetailsItem[];

interface BuildDetailsItem {
  data: Data;
}
interface Data {
  builds: Builds;
}
interface Builds {
  byId: Build;
  __typename: string;
}
export interface Build {
  __typename: string;
  id: string;
  platform: string;
  status: string;
  app: App;
  artifacts: Artifacts;
  distribution: string;
  logFiles: string[];
  metrics: Metrics;
  initiatingActor: InitiatingActor;
  createdAt: string;
  enqueuedAt: string;
  provisioningStartedAt: string;
  workerStartedAt: string;
  completedAt: string;
  updatedAt: string;
  expirationDate: string;
  sdkVersion: string;
  runtime: Runtime;
  updateChannel: UpdateChannel;
  buildProfile: string;
  appVersion: string;
  appBuildVersion: string;
  gitCommitHash: string;
  gitCommitMessage: string;
  isGitWorkingTreeDirty: boolean;
  message: null;
  resourceClassDisplayName: string;
  gitRef: null;
  projectRootDirectory: null;
  githubRepositoryOwnerAndName: null;
  projectMetadataFileUrl: string;
  childBuild: null;
  priority: string;
  queuePosition: null;
  initialQueuePosition: null;
  estimatedWaitTimeLeftSeconds: null;
  submissions: SubmissionsItem[];
  canRetry: boolean;
  retryDisabledReason: string;
  maxRetryTimeMinutes: number;
  buildMode: string;
  customWorkflowName: null;
  isWaived: boolean;
  developmentClient: boolean;
  selectedImage: null;
  customNodeVersion: null;
  isForIosSimulator: boolean;
  resolvedEnvironment: string;
  deployment: Deployment;
}
interface App {
  id: string;
  fullName: string;
  slug: string;
  name: string;
  iconUrl: string;
  githubRepository: null;
  ownerAccount: OwnerAccount;
  __typename: string;
}
interface OwnerAccount {
  name: string;
  __typename: string;
}
interface Artifacts {
  applicationArchiveUrl: string;
  buildArtifactsUrl: null;
  xcodeBuildLogsUrl: string;
  __typename: string;
}
interface Metrics {
  buildWaitTime: number;
  buildQueueTime: number;
  buildDuration: number;
  __typename: string;
}
interface InitiatingActor {
  id: string;
  displayName: string;
  username: string;
  fullName: string;
  profilePhoto: string;
  __typename: string;
}
interface Runtime {
  id: string;
  version: string;
  __typename: string;
}
interface UpdateChannel {
  id: string;
  name: string;
  __typename: string;
}
interface SubmissionsItem {
  id: string;
  status: string;
  canRetry: boolean;
  __typename: string;
}
interface Deployment {
  id: string;
  runtime: Runtime;
  channel: Channel;
  __typename: string;
}
interface Channel {
  __typename: string;
  id: string;
  name: string;
  branchMapping: string;
  createdAt: string;
  updatedAt: string;
  isPaused: boolean;
}
