export interface Session {
  name?: string;
  id: string;
  prompt: string;
  sourceContext?: SourceContext;
  title?: string;
  requirePlanApproval?: boolean;
  automationMode?: AutomationMode;
  createTime: string;
  updateTime: string;
  state: SessionState;
  url: string;
  outputs?: SessionOutput[];
}

export interface SourceContext {
  source: string;
  githubRepoContext?: GitHubRepoContext;
}

export interface GitHubRepoContext {
  startingBranch: string;
}

export enum AutomationMode {
  AUTOMATION_MODE_UNSPECIFIED = "AUTOMATION_MODE_UNSPECIFIED",
  AUTO_CREATE_PR = "AUTO_CREATE_PR",
}

export enum SessionState {
  STATE_UNSPECIFIED = "STATE_UNSPECIFIED",
  QUEUED = "QUEUED",
  PLANNING = "PLANNING",
  AWAITING_PLAN_APPROVAL = "AWAITING_PLAN_APPROVAL",
  AWAITING_USER_FEEDBACK = "AWAITING_USER_FEEDBACK",
  IN_PROGRESS = "IN_PROGRESS",
  PAUSED = "PAUSED",
  FAILED = "FAILED",
  COMPLETED = "COMPLETED",
}

export interface SessionOutput {
  pullRequest?: PullRequest;
}

export interface PullRequest {
  url: string;
  title: string;
  description: string;
}

export interface Activity {
  name: string;
  id: string;
  description: string;
  createTime: string;
  originator: string;
  artifacts?: Artifact[];

  // Union fields
  agentMessaged?: AgentMessaged;
  userMessaged?: UserMessaged;
  planGenerated?: PlanGenerated;
  planApproved?: PlanApproved;
  progressUpdated?: ProgressUpdated;
  sessionCompleted?: SessionCompleted;
  sessionFailed?: SessionFailed;
}

export interface AgentMessaged {
  agentMessage: string;
}

export interface UserMessaged {
  userMessage: string;
}

export interface PlanGenerated {
  plan: Plan;
}

export interface Plan {
  id: string;
  steps: PlanStep[];
  createTime: string;
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  index?: number;
}

export interface PlanApproved {
  planId: string;
}

export interface ProgressUpdated {
  title: string;
  description: string;
}

export type SessionCompleted = Record<string, never>;

export interface SessionFailed {
  reason: string;
}

export interface Artifact {
  changeSet?: ChangeSet;
  media?: Media;
  bashOutput?: BashOutput;
}

export interface ChangeSet {
  source: string;
  gitPatch?: GitPatch;
}

export interface GitPatch {
  unidiffPatch?: string;
  baseCommitId?: string;
  suggestedCommitMessage?: string;
}

export interface Media {
  data: string; // base64 encoded
  mimeType: string;
}

export interface BashOutput {
  command: string;
  output: string;
  exitCode: number;
}

export interface Source {
  name: string;
  id: string;
  githubRepo?: GitHubRepo;
}

export interface GitHubRepo {
  owner: string;
  repo: string;
  isPrivate: boolean;
  defaultBranch?: GitHubBranch;
  branches?: GitHubBranch[];
}

export interface GitHubBranch {
  name: string;
  displayName: string;
}

// API Response Types
export interface ListSessionsResponse {
  sessions: Session[];
  nextPageToken?: string;
}

export interface ListActivitiesResponse {
  activities: Activity[];
  nextPageToken?: string;
}

export interface ListSourcesResponse {
  sources: Source[];
  nextPageToken?: string;
}

// Constants
export const NO_REPO = "NO_REPO";
