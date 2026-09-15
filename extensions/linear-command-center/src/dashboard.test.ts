import { describe, expect, it } from "vitest";
import { buildDashboard, statesForIssue } from "./dashboard";
import { DashboardResponse, Issue, Preferences, Team, WorkflowState } from "./types";

const alphaStates: WorkflowState[] = [
  { id: "alpha-todo", name: "Queue", type: "unstarted", color: "#999999" },
  { id: "alpha-doing", name: "Working", type: "started", color: "#4488ff" },
  { id: "alpha-review", name: "Peer Check", type: "started", color: "#8844ff" },
  { id: "alpha-done", name: "Shipped", type: "completed", color: "#44aa66" },
];

const betaStates: WorkflowState[] = [
  { id: "beta-todo", name: "Planned", type: "unstarted", color: "#999999" },
  { id: "beta-doing", name: "Executing", type: "started", color: "#4488ff" },
];

const teams: Team[] = [
  {
    id: "team-alpha",
    key: "ALP",
    name: "Alpha",
    states: { nodes: alphaStates },
    projects: { nodes: [{ id: "project-agent", name: "Automation Agents" }] },
  },
  {
    id: "team-beta",
    key: "BET",
    name: "Beta",
    states: { nodes: betaStates },
    projects: { nodes: [] },
  },
];

function issue(id: string, team: Team, state: WorkflowState, overrides: Partial<Issue> = {}): Issue {
  return {
    id,
    identifier: `${team.key}-${id}`,
    title: `Issue ${id}`,
    url: `https://linear.app/example/issue/${team.key}-${id}`,
    priority: 2,
    priorityLabel: "High",
    dueDate: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    state,
    team: { id: team.id, key: team.key, name: team.name },
    project: null,
    delegate: null,
    labels: { nodes: [] },
    inverseRelations: { nodes: [] },
    ...overrides,
  };
}

function fixture(): DashboardResponse {
  const alphaAgent = issue("1", teams[0], alphaStates[1], {
    project: { id: "project-agent", name: "Automation Agents" },
  });
  const alphaReview = issue("2", teams[0], alphaStates[2]);
  const alphaTodo = issue("3", teams[0], alphaStates[0]);
  const betaActive = issue("4", teams[1], betaStates[1]);

  return {
    viewer: {
      id: "viewer",
      assignedIssues: { nodes: [alphaAgent, alphaReview, alphaTodo, betaActive] },
      delegatedIssues: { nodes: [] },
    },
    agentSessions: { nodes: [] },
    teams: { nodes: teams },
  };
}

const preferences: Preferences = {
  teamKey: "ALP",
  agentProjectKeywords: "agent, automation",
  reviewStateNames: "Peer Check",
  staleAfterHours: "24",
  menuItemLimit: "6",
};

describe("buildDashboard", () => {
  it("uses workflow types and configurable names instead of fixed status names", () => {
    const model = buildDashboard(fixture(), preferences);

    expect(model.issues.map((item) => item.identifier)).toHaveLength(3);
    expect(model.agentWork.map((item) => item.identifier)).toEqual(["ALP-1"]);
    expect(model.reviews.map((item) => item.identifier)).toEqual(["ALP-2"]);
    expect(model.todo.map((item) => item.identifier)).toEqual(["ALP-3"]);
  });

  it("keeps each issue paired with its own team's workflow states", () => {
    const model = buildDashboard(fixture(), { ...preferences, teamKey: "" });
    const betaIssue = model.issues.find((item) => item.team.key === "BET");

    expect(betaIssue).toBeDefined();
    expect(statesForIssue(model, betaIssue!).map((state) => state.id)).toEqual(["beta-todo", "beta-doing"]);
  });

  it("fails closed when a configured team is unavailable", () => {
    expect(() => buildDashboard(fixture(), { ...preferences, teamKey: "MISSING" })).toThrow(
      "No Linear team found for MISSING",
    );
  });
});
