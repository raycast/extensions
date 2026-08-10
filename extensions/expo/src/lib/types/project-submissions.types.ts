import { ErrorResponse } from "../types";

export type ProjectSubmissionResponse = ProjectSubmissionsSuccess | ErrorResponse;

type ProjectSubmissionsSuccess = ProjectSubmissionItem[];

interface ProjectSubmissionItem {
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
  submissionsPaginated: SubmissionsPaginated;
  __typename: string;
}
interface SubmissionsPaginated {
  edges: EdgesItem[];
  pageInfo: PageInfo;
  __typename: string;
}
interface EdgesItem {
  node: ProjectSubmission;
  __typename: string;
}
export interface ProjectSubmission {
  id: string;
  __typename: string;
  activityTimestamp: string;
  createdAt: string;
  initiatingActor: InitiatingActor;
  app: App;
  submittedBuild: SubmittedBuild;
  submissionPlatform: string;
  submissionStatus: string;
}
interface InitiatingActor {
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
interface SubmittedBuild {
  id: string;
  appVersion: string;
  __typename: string;
}
interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string;
  endCursor: string;
  __typename: string;
}
