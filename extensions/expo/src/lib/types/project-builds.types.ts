import { ErrorResponse } from "../types";

export type ProjectBuildsResponse = ProjectBulildsSuccess | ErrorResponse;

export type ProjectBulildsSuccess = ProjectBulildsSuccessItem[];

interface ProjectBulildsSuccessItem {
  data: Data;
}
interface Data {
  app: App;
}
interface App {
  byFullName?: ByFullName;
  __typename: string;
  id?: string;
  icon?: null;
  iconUrl?: string;
  fullName?: string;
  name?: string;
  slug?: string;
  ownerAccount?: OwnerAccount;
  githubRepository?: GithubRepository;
  lastDeletionAttemptTime?: null;
}
interface ByFullName {
  id: string;
  buildsPaginated: BuildsPaginated;
  __typename: string;
}
interface BuildsPaginated {
  edges: EdgesItem[];
  pageInfo: PageInfo;
  __typename: string;
}
interface EdgesItem {
  node: ProjectBuild;
  __typename: string;
}
export interface ProjectBuild {
  id: string;
  __typename: string;
  activityTimestamp: string;
  createdAt: string;
  actor: Actor;
  app: App;
  initiatingActor: InitiatingActor;
  buildChannel: BuildChannel;
  buildPlatform: string;
  buildStatus: string;
  buildRuntime: BuildRuntime;
  buildGitCommitHash: string;
  buildGitCommitMessage: string;
  buildIsGitWorkingTreeDirty: boolean;
  message: null;
  expirationDate: string;
  distribution: string;
  buildMode: string;
  customWorkflowName: null;
  buildProfile: string;
  gitRef: null;
  appBuildVersion: string;
  appVersion: string;
  metrics: Metrics;
  developmentClient: boolean;
  isForIosSimulator: boolean;
  deployment: Deployment;
}
interface Actor {
  id: string;
  __typename: string;
  displayName: string;
  profilePhoto: string;
}
interface OwnerAccount {
  name: string;
  id: string;
  __typename: string;
}
interface GithubRepository {
  githubRepositoryUrl: string;
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
interface BuildChannel {
  id: string;
  name: string;
  __typename: string;
}
interface BuildRuntime {
  id: string;
  version: string;
  __typename: string;
}
interface Metrics {
  buildDuration: number;
  __typename: string;
}
interface Deployment {
  id: string;
  runtime: Runtime;
  channel: Channel;
  __typename: string;
}
interface Runtime {
  __typename: string;
  id: string;
  version: string;
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
interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
  endCursor: string;
  __typename: string;
}
