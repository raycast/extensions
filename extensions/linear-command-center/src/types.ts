export type WorkflowStateType = "backlog" | "unstarted" | "started" | "completed" | "canceled" | "duplicate";

export type AgentSessionStatus = "pending" | "active" | "awaitingInput" | "complete" | "error" | "stale";

export type WorkflowState = {
  id: string;
  name: string;
  type: WorkflowStateType;
  color: string;
};

export type Team = {
  id: string;
  key: string;
  name: string;
  states: { nodes: WorkflowState[] };
  projects: { nodes: Array<{ id: string; name: string }> };
};

export type PageInfo = {
  hasNextPage: boolean;
  endCursor?: string | null;
};

export type RelatedIssue = {
  id: string;
  identifier: string;
  title: string;
  url: string;
  state: Pick<WorkflowState, "name" | "type">;
};

export type IssueRelation = {
  id: string;
  type: string;
  issue: RelatedIssue;
  relatedIssue: RelatedIssue;
};

export type Issue = {
  id: string;
  identifier: string;
  title: string;
  url: string;
  priority: number;
  priorityLabel: string;
  dueDate?: string | null;
  updatedAt: string;
  createdAt: string;
  state: WorkflowState;
  team: Pick<Team, "id" | "key" | "name">;
  project?: { id: string; name: string } | null;
  delegate?: { id: string; name: string; displayName: string } | null;
  labels: { nodes: Array<{ id: string; name: string; color: string }> };
  inverseRelations: {
    nodes: IssueRelation[];
    pageInfo?: PageInfo;
  };
};

export type AgentSession = {
  id: string;
  status: AgentSessionStatus;
  summary?: string | null;
  updatedAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  url?: string | null;
  externalLinks: Array<{ label: string; url: string }>;
  appUser: { id: string; name: string; displayName: string };
  issue?: { id: string } | null;
};

export type DashboardResponse = {
  viewer: {
    id: string;
    assignedIssues: { nodes: Issue[] };
    delegatedIssues: { nodes: Array<{ id: string }> };
  };
  agentSessions: { nodes: AgentSession[] };
  teams: { nodes: Team[] };
};

export type IssueWithContext = Issue & {
  agentSession?: AgentSession;
  isDelegated: boolean;
  isBlocked: boolean;
  isOverdue: boolean;
  isStale: boolean;
  isReview: boolean;
  needsAttention: boolean;
  attentionReasons: string[];
};
