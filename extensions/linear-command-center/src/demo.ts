import { DashboardResponse, Issue, Team, WorkflowState } from "./types";

const states: WorkflowState[] = [
  { id: "demo-todo", name: "Todo", type: "unstarted", color: "#6B7280" },
  { id: "demo-progress", name: "In Progress", type: "started", color: "#4F8CFF" },
  { id: "demo-review", name: "In Review", type: "started", color: "#9B6CFF" },
  { id: "demo-done", name: "Done", type: "completed", color: "#45B26B" },
];

const team: Team = {
  id: "demo-team",
  key: "ENG",
  name: "Engineering",
  states: { nodes: states },
  projects: {
    nodes: [
      { id: "demo-agent-project", name: "Agent Platform" },
      { id: "demo-product-project", name: "Product Quality" },
    ],
  },
};

function issue(id: string, title: string, state: WorkflowState, overrides: Partial<Issue> = {}): Issue {
  return {
    id,
    identifier: `ENG-${id}`,
    title,
    url: `https://linear.app/example/issue/ENG-${id}`,
    priority: 2,
    priorityLabel: "High",
    dueDate: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    state,
    team: { id: team.id, key: team.key, name: team.name },
    project: { id: "demo-product-project", name: "Product Quality" },
    delegate: null,
    labels: { nodes: [] },
    inverseRelations: { nodes: [] },
    ...overrides,
  };
}

export function demoDashboard(): DashboardResponse {
  const waiting = issue("101", "Approve the agent's rollout plan", states[1], {
    project: { id: "demo-agent-project", name: "Agent Platform" },
    delegate: { id: "agent-codex", name: "codex", displayName: "Codex" },
  });
  const reviewing = issue("102", "Review the new onboarding experience", states[2]);
  const agentWorking = issue("103", "Add resilient API retry handling", states[1], {
    project: { id: "demo-agent-project", name: "Agent Platform" },
    delegate: { id: "agent-claude", name: "claude", displayName: "Claude" },
  });
  const active = issue("104", "Polish the settings information architecture", states[1]);
  const todo = issue("105", "Define the next reliability milestone", states[0], { priority: 3 });

  return {
    viewer: {
      id: "demo-viewer",
      assignedIssues: { nodes: [waiting, reviewing, agentWorking, active, todo] },
      delegatedIssues: { nodes: [{ id: waiting.id }, { id: agentWorking.id }] },
    },
    agentSessions: {
      nodes: [
        {
          id: "session-waiting",
          status: "awaitingInput",
          summary: "Waiting for rollout approval",
          updatedAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
          endedAt: null,
          url: "https://linear.app/example/agent/session-waiting",
          externalLinks: [{ label: "Draft PR", url: "https://github.com/example/repository/pull/42" }],
          appUser: { id: "agent-codex", name: "codex", displayName: "Codex" },
          issue: { id: waiting.id },
        },
        {
          id: "session-active",
          status: "active",
          summary: "Implementing retry handling",
          updatedAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
          endedAt: null,
          url: "https://linear.app/example/agent/session-active",
          externalLinks: [],
          appUser: { id: "agent-claude", name: "claude", displayName: "Claude" },
          issue: { id: agentWorking.id },
        },
      ],
    },
    teams: { nodes: [team] },
  };
}
