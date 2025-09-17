/**
 * Common types and interfaces for Azure DevOps operations
 */

export interface Preferences {
  branchPrefix: string;
  azureOrganization?: string;
  azureProject?: string;
  azureRepository?: string;
  sourceBranch: string;
}

export interface WorkItemDetails {
  id: string;
  title: string;
  type: string;
  assignedTo?: string;
  state: string;
}

export interface WorkItemLite {
  id: number;
  title: string;
  description?: string;
  type?: string;
  teamProject?: string;
  state?: string;
}

export interface RelationItem {
  rel: string;
  url: string;
}

export interface PullRequestResult {
  pullRequestId: number;
  title: string;
  project: string;
  url?: string;
}

export interface WorkItemComment {
  id: number;
  text: string;
  createdBy: {
    displayName: string;
    uniqueName: string;
  };
  createdDate: string;
  modifiedBy?: {
    displayName: string;
    uniqueName: string;
  };
  modifiedDate?: string;
}

export interface WorkItemRelations {
  parent: WorkItemLite | null;
  siblings: WorkItemLite[];
  related: WorkItemLite[];
  children: WorkItemLite[];
}

export interface ActivateAndCreatePRResult {
  success: boolean;
  prResult?: PullRequestResult;
  branchName?: string;
}

export interface CommentResult {
  success: boolean;
  error?: string;
}
