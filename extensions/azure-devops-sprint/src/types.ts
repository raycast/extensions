export interface WorkItem {
  id: number;
  title: string;
  type: string;
  state: string;
  parentId?: number;
  /** Parent that is also in the sprint (hierarchy as the sprint backlog shows it). */
  sprintParentId?: number;
  assignedTo?: string;
  iterationPath: string;
  descriptionHtml?: string;
  acceptanceHtml?: string;
  tags?: string;
  /** Backlog order (Microsoft.VSTS.Common.StackRank), same as the web board. */
  order?: number;
  storyPoints?: number;
  estimate?: number;
  completed?: number;
  remaining?: number;
}

export interface Iteration {
  id: string;
  name: string;
  path: string;
  start?: string;
  end?: string;
  timeFrame?: string;
}

export interface Comment {
  id: number;
  author: string;
  date: string;
  html: string;
}

export interface RelatedItem {
  /** Link type name as Azure DevOps shows it: Parent, Child, Related, Predecessor, Successor… */
  link: string;
  item: WorkItem;
}

export interface PullRequest {
  id: number;
  title: string;
  status: string;
  author?: string;
  date?: string;
  repository?: string;
  sourceBranch?: string;
  targetBranch?: string;
  url?: string;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author?: string;
  date?: string;
  repository?: string;
  /** Branch the commit was pushed to. */
  branch?: string;
  url?: string;
}

export interface Relations {
  items: RelatedItem[];
  pullRequests: PullRequest[];
  commits: CommitInfo[];
}
