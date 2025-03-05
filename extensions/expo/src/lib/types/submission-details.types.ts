import { ErrorResponse } from "../types";

export type SubmissionDetailsResponse = SubmissionDetailsSuccess | ErrorResponse;

export type SubmissionDetailsSuccess = SubmissionSuccessItem[];

interface SubmissionSuccessItem {
  data: Data;
}
interface Data {
  submissions: Submissions;
}
interface Submissions {
  byId: SubmissionDetails;
  __typename: string;
}
export interface SubmissionDetails {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  platform: string;
  priority: string;
  app: App;
  initiatingActor: InitiatingActor;
  logFiles: string[];
  error: Error;
  submittedBuild: SubmittedBuild;
  canRetry: boolean;
  childSubmission: null;
  __typename: string;
}
interface App {
  id: string;
  name: string;
  icon?: null;
  fullName: string;
  __typename: string;
  slug?: string;
  iconUrl?: string;
  githubRepository?: GithubRepository;
  ownerAccount?: OwnerAccount;
}
interface InitiatingActor {
  __typename: string;
  firstName?: string;
  displayName: string;
  username: string;
  fullName: string;
  profilePhoto: string;
  id?: string;
}
interface Error {
  errorCode: string;
  message: string;
  __typename: string;
}
interface SubmittedBuild {
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
}
interface GithubRepository {
  githubRepositoryUrl: string;
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
