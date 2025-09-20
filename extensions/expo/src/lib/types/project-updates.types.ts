import { ErrorResponse } from "../types";

export type ProjectUpdatesResponse = ProjectUpdatesSuccess | ErrorResponse;

type ProjectUpdatesSuccess = ProjectUpdatesSuccessItem[];
interface ProjectUpdatesSuccessItem {
  data: Data;
}
interface Data {
  app: App;
}
interface App {
  byFullName?: ByFullName;
  __typename: string;
  id?: string;
  fullName?: string;
  slug?: string;
  icon?: null;
  iconUrl?: string;
  name?: string;
  ownerAccount?: OwnerAccount;
  githubRepository?: GithubRepository;
  lastDeletionAttemptTime?: null;
}
interface ByFullName {
  id: string;
  updatesPaginated: UpdatesPaginated;
  __typename: string;
}
interface UpdatesPaginated {
  edges: EdgesItem[];
  pageInfo: PageInfo;
  __typename: string;
}
interface EdgesItem {
  node: ProjectUpdate;
  __typename: string;
}
export interface ProjectUpdate {
  __typename: string;
  id: string;
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
  manifestFragment: string;
  app: App;
  actor: Actor;
  branch: Branch;
}
interface UpdateRuntime {
  id: string;
  version: string;
  __typename: string;
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
interface Actor {
  __typename: string;
  id: string;
  displayName: string;
  profilePhoto: string;
  fullName: string;
  username: string;
  bestContactEmail: string;
}
interface Branch {
  __typename: string;
  id: string;
  name: string;
}
interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
  endCursor: string;
  __typename: string;
}
