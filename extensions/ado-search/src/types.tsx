export type AdoGitrepostitoriesResponse = {
  value: Repository[];
};

export type AdoProjectResponse = {
  value: Project[];
};

export type AdoPrResponse = {
  value: PullRequest[];
};

export type Repository = {
  id: string;
  name: string;
  url: string;
  defaultBranch: string;
  project: Project;
  remoteUrl: string;
  sshUrl: string;
  webUrl: string;
  isDisabled: boolean;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  url: string;
  projectUrl: string;
};

export type PullRequest = {
  repository: Repository;
  pullRequestId: string;
  codeReviewId: string;
  status: string;
  creationDate: string;
  title: string;
  description: string;
  sourceRefName: string;
  targetRefName: string;
  mergeStatus: string;
  url: string;
  supportsIterations: boolean;
};

export type AdoIdentityResponse = {
  value: AdoIdentity[];
};
export type AdoIdentity = {
  id: string;
};

export interface AdoWorkItemsResponse {
  queryType: string;
  queryResultType: string;
  asOf: string;
  workItems: WorkItemReference[];
}

export interface WorkItemReference {
  id: number;
  url: string;
}

export interface AdoWorkItemDetailsResponse {
  value: WorkItemDetails[];
}

export interface WorkItemDetails {
  id: number;
  fields: {
    "System.Title": string;
    "System.State": string;
    "System.WorkItemType": string;
    "System.AssignedTo"?: {
      displayName: string;
      uniqueName: string;
    };
  };
}

export type AdoPipeline = {
  _links: {
    self: {
      href: string;
    };
    web: {
      href: string;
    };
  };
  url: string;
  id: number;
  revision: number;
  name: string;
  folder: string;
};

export type AdoPipelinesResponse = {
  count: number;
  value: AdoPipeline[];
};
