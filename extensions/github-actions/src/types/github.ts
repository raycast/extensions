export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  htmlUrl: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
}

export interface GitHubWorkflow {
  id: number;
  name: string;
  path: string;
  state: string;
  htmlUrl: string;
}

export interface GitHubActor {
  login: string;
}

export interface GitHubWorkflowRun {
  id: number;
  name: string;
  displayTitle: string;
  event: string;
  status: string;
  conclusion: string | null;
  htmlUrl: string;
  headBranch: string;
  runStartedAt: string | null;
  updatedAt: string;
  actor: GitHubActor | null;
  workflowId: number;
  workflowName: string;
}

export interface GitHubJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  htmlUrl: string;
}

export type DispatchInputType = "string" | "choice" | "boolean" | "environment";

export interface WorkflowDispatchInput {
  name: string;
  description?: string;
  required: boolean;
  defaultValue?: string;
  type: DispatchInputType;
  options?: string[];
}

export interface DispatchableWorkflow extends GitHubWorkflow {
  inputs: WorkflowDispatchInput[];
}

export interface RecentWorkflowTarget {
  repoFullName: string;
  workflowId: number;
  workflowName: string;
}
