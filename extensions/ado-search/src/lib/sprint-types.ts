export interface SprintItem {
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
  /** Story Points (Agile), Effort (Scrum) or Size (CMMI), whichever the process has. */
  storyPoints?: number;
  estimate?: number;
  completed?: number;
  remaining?: number;
  /** True when the item's type has the Completed Work field, so hours can be logged on it. */
  tracksHours: boolean;
  /** Fields the shared work item views of the extension need. */
  project: string;
  areaPath: string;
  changedDate: string;
  priority?: number;
  reproStepsHtml?: string;
  url: string;
}

/** The little the work item actions need, so they work with items from any command. */
export type ItemRef = Pick<SprintItem, "id" | "title" | "project" | "iterationPath">;

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
  item: SprintItem;
}

export interface LinkedPullRequest {
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
  pullRequests: LinkedPullRequest[];
  commits: CommitInfo[];
}
