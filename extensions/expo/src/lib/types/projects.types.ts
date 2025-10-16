import { ErrorResponse } from "../types";

// view projects
export type ProjectsResponse = ProjectsSuccess | ErrorResponse;

export type ProjectsSuccess = ProjectsSuccessItem[];

interface ProjectsSuccessItem {
  data: {
    account: {
      byName: {
        id: string;
        appsPaginated: {
          edges: {
            node: Project;
            __typename: string;
          }[];
          pageInfo: {
            hasNextPage: boolean;
            hasPreviousPage: boolean;
            startCursor: string;
            endCursor: string;
            __typename: string;
          };
          __typename: string;
        };
        __typename: string;
      };
      __typename: string;
    };
  };
}

export interface Project {
  __typename: string;
  id: string;
  icon: null;
  iconUrl: string;
  fullName: string;
  name: string;
  slug: string;
  ownerAccount: {
    name: string;
    id: string;
    __typename: string;
  };
  githubRepository: {
    githubRepositoryUrl: string;
    __typename: string;
    metadata: {
      githubRepoName: string;
      githubRepoOwnerName: string;
      __typename: string;
    };
  };
  lastDeletionAttemptTime: null;
}

// Project Details
export type ProjectTimelineResponse = ProjectTimelineSuccess | ErrorResponse;

export type ProjectTimelineSuccess = ProjectTimelineItem[];

interface ProjectTimelineItem {
  data: {
    app: App;
  };
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
  timelineActivity: TimelineActivity;
  __typename: string;
}
interface TimelineActivity {
  edges: EdgesItem[];
  pageInfo: PageInfo;
  __typename: string;
}
interface EdgesItem {
  cursor: string;
  node: ProjectActivity;
  __typename: string;
}
export interface ProjectActivity {
  __typename: string;
  id: string;
  activityTimestamp: string;
  createdAt: string;
  initiatingActor?: InitiatingActor;
  app: App;
  submittedBuild?: SubmittedBuild;
  submissionPlatform?: string;
  submissionStatus?: string;
  actor?: Actor;
  buildChannel?: BuildChannel;
  buildPlatform?: string;
  buildStatus?: string;
  buildRuntime?: BuildRuntime;
  buildGitCommitHash?: string;
  buildGitCommitMessage?: string;
  buildIsGitWorkingTreeDirty?: boolean;
  message: null | string;
  expirationDate?: string;
  distribution?: string;
  buildMode?: string;
  customWorkflowName?: null;
  buildProfile?: string;
  gitRef?: null;
  appBuildVersion?: string;
  appVersion?: string;
  metrics?: Metrics;
  developmentClient?: boolean;
  isForIosSimulator?: boolean;
  deployment?: Deployment;
  group?: string;
  updatedAt?: string;
  isRollBackToEmbedded?: boolean;
  codeSigningInfo?: null;
  branchId?: string;
  updateRuntime?: UpdateRuntime;
  updatePlatform?: string;
  updateGitCommitHash?: string;
  updateIsGitWorkingTreeDirty?: boolean;
  manifestFragment?: string;
  branch?: Branch;
}
interface InitiatingActor {
  id: string;
  __typename: string;
  displayName: string;
  profilePhoto: string;
  username?: string;
  fullName?: string;
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
interface SubmittedBuild {
  id: string;
  appVersion: string;
  __typename: string;
}
interface Actor {
  id: string;
  __typename: string;
  displayName: string;
  profilePhoto: string;
  fullName?: string;
  username?: string;
  bestContactEmail?: string;
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
interface UpdateRuntime {
  id: string;
  version: string;
  __typename: string;
}
interface Branch {
  __typename: string;
  id: string;
  name: string;
}
interface PageInfo {
  hasNextPage: boolean;
  startCursor: string;
  endCursor: string;
  __typename: string;
}
