import { AgentSession, DashboardResponse, Issue, IssueWithContext, WorkflowState } from "./types";

const CLOSED_TYPES = new Set(["completed", "canceled", "duplicate"]);
const ACTIVE_AGENT_STATUSES = new Set(["pending", "active", "awaitingInput", "error", "stale"]);
const AGENT_ATTENTION_STATUSES = new Set(["awaitingInput", "error", "stale"]);

export type DashboardModel = {
  issues: IssueWithContext[];
  teams: DashboardResponse["teams"]["nodes"];
  team: DashboardResponse["teams"]["nodes"][number];
  needsYou: IssueWithContext[];
  reviews: IssueWithContext[];
  agentWork: IssueWithContext[];
  active: IssueWithContext[];
  todo: IssueWithContext[];
};

export function buildDashboard(data: DashboardResponse, preferences: Preferences): DashboardModel {
  const requestedTeamKey = preferences.demoMode ? undefined : preferences.teamKey?.trim().toUpperCase();
  const team = requestedTeamKey
    ? data.teams.nodes.find((candidate) => candidate.key.toUpperCase() === requestedTeamKey)
    : data.teams.nodes[0];
  if (!team) {
    throw new Error(requestedTeamKey ? `No Linear team found for ${requestedTeamKey}` : "No Linear teams found");
  }

  const delegatedIds = new Set(data.viewer.delegatedIssues.nodes.map((issue) => issue.id));
  const sessionsByIssue = new Map<string, AgentSession>();
  for (const session of data.agentSessions.nodes) {
    const issueId = session.issue?.id;
    if (!issueId || !ACTIVE_AGENT_STATUSES.has(session.status) || sessionsByIssue.has(issueId)) continue;
    sessionsByIssue.set(issueId, session);
  }

  const staleAfterMs = Math.max(1, Number(preferences.staleAfterHours) || 24) * 60 * 60 * 1000;
  const reviewStateNames = csvValues(preferences.reviewStateNames);
  const agentProjectKeywords = csvValues(preferences.agentProjectKeywords || "agent");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const issues = data.viewer.assignedIssues.nodes
    .filter((issue) => !requestedTeamKey || issue.team.key.toUpperCase() === requestedTeamKey)
    .filter((issue) => !CLOSED_TYPES.has(issue.state.type) && issue.state.type !== "backlog")
    .map((issue): IssueWithContext => {
      const agentSession = sessionsByIssue.get(issue.id);
      const isAgentProject = Boolean(
        (preferences.agentProjectId && issue.project?.id === preferences.agentProjectId) ||
        (issue.project && agentProjectKeywords.some((keyword) => issue.project!.name.toLowerCase().includes(keyword))),
      );
      const hasAgentLabel = issue.labels.nodes.some((label) => label.name.toLowerCase() === "agent");
      const isDelegated = Boolean(
        issue.delegate || delegatedIds.has(issue.id) || agentSession || isAgentProject || hasAgentLabel,
      );
      const isBlocked = issue.inverseRelations.nodes.some(
        (relation) => relation.type === "blocks" && !CLOSED_TYPES.has(relation.issue.state.type),
      );
      const isOverdue = Boolean(issue.dueDate && new Date(`${issue.dueDate}T00:00:00`) < today);
      const isStale = issue.state.type === "started" && Date.now() - new Date(issue.updatedAt).getTime() > staleAfterMs;
      const isReview = isReviewState(issue.state, reviewStateNames);

      const attentionReasons: string[] = [];
      if (agentSession && AGENT_ATTENTION_STATUSES.has(agentSession.status)) {
        attentionReasons.push(
          agentSession.status === "awaitingInput" ? "Agent needs input" : `Agent ${agentSession.status}`,
        );
      }
      if (isBlocked) attentionReasons.push("Blocked");
      if (isOverdue) attentionReasons.push("Overdue");
      if (isStale) attentionReasons.push("Stale");

      return {
        ...issue,
        agentSession,
        isDelegated,
        isBlocked,
        isOverdue,
        isStale,
        needsAttention: attentionReasons.length > 0,
        attentionReasons,
        isReview,
      };
    })
    .sort(compareIssues);

  return {
    issues,
    teams: data.teams.nodes,
    team,
    needsYou: issues.filter((issue) => issue.needsAttention),
    reviews: issues.filter((issue) => issue.isReview && !issue.needsAttention),
    agentWork: issues.filter(
      (issue) =>
        issue.isDelegated &&
        !issue.needsAttention &&
        !issue.isReview &&
        (issue.agentSession ? ACTIVE_AGENT_STATUSES.has(issue.agentSession.status) : issue.state.type === "started"),
    ),
    active: issues.filter(
      (issue) => issue.state.type === "started" && !issue.needsAttention && !issue.isReview && !issue.isDelegated,
    ),
    // Anything that needs attention is already in needsYou; listing it here
    // too would show the same issue twice.
    todo: issues.filter((issue) => issue.state.type === "unstarted" && !issue.needsAttention),
  };
}

function csvValues(value?: string): string[] {
  return (value || "")
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function isReviewState(state: WorkflowState, configuredNames: string[]): boolean {
  const name = state.name.toLowerCase();
  return configuredNames.length ? configuredNames.includes(name) : name.includes("review");
}

export function statesForIssue(model: DashboardModel, issue: Issue): WorkflowState[] {
  return model.teams.find((team) => team.id === issue.team.id)?.states.nodes || [];
}

function compareIssues(left: IssueWithContext, right: IssueWithContext): number {
  const leftAttention = left.needsAttention ? 1 : 0;
  const rightAttention = right.needsAttention ? 1 : 0;
  if (leftAttention !== rightAttention) return rightAttention - leftAttention;
  if (left.priority !== right.priority) {
    const normalizedLeft = left.priority === 0 ? 5 : left.priority;
    const normalizedRight = right.priority === 0 ? 5 : right.priority;
    return normalizedLeft - normalizedRight;
  }
  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

export function sessionLabel(session?: AgentSession): string | undefined {
  if (!session) return undefined;
  const labels: Record<AgentSession["status"], string> = {
    pending: "Agent pending",
    active: "Agent working",
    awaitingInput: "Needs your input",
    complete: "Agent complete",
    error: "Agent error",
    stale: "Agent stale",
  };
  return labels[session.status];
}

export function issueSubtitle(issue: IssueWithContext): string {
  if (issue.attentionReasons.length) return issue.attentionReasons.join(" · ");
  return (
    sessionLabel(issue.agentSession) || (issue.isDelegated ? `Agent-tracked · ${issue.state.name}` : issue.state.name)
  );
}

export function relativeAge(value: string): string {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function compactTitle(issue: Issue): string {
  const max = 52;
  return `${issue.identifier} ${issue.title.length > max ? `${issue.title.slice(0, max - 1)}…` : issue.title}`;
}
