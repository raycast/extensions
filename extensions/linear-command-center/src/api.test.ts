import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const preferences = vi.hoisted(() => ({ demoMode: false }));
vi.mock("@raycast/api", () => ({ getPreferenceValues: () => preferences }));
vi.mock("@raycast/utils", () => ({
  getAccessToken: () => ({ token: "test-token" }),
  OAuthService: { linear: () => ({}) },
}));

import { addIssueComment, createIssue, loadDashboard, updateIssueState } from "./api";

type Call = { query: string; variables: Record<string, unknown> };
const calls: Call[] = [];
const page = (hasNextPage: boolean, endCursor: string | null) => ({ hasNextPage, endCursor });

function issue(id: string, relations = 0, more = false) {
  return {
    id,
    identifier: `ENG-${id}`,
    title: `Issue ${id}`,
    url: "",
    priority: 2,
    priorityLabel: "High",
    dueDate: null,
    updatedAt: "2026-09-15T00:00:00.000Z",
    createdAt: "2026-09-15T00:00:00.000Z",
    state: { id: "s", name: "Todo", type: "unstarted", color: "#000" },
    team: { id: "t1", key: "ENG", name: "Eng" },
    project: null,
    delegate: null,
    labels: { nodes: [] },
    inverseRelations: {
      nodes: Array.from({ length: relations }, (_, i) => ({
        id: `${id}-r${i}`,
        type: "related",
        issue: { id: "x", identifier: "X", title: "", url: "", state: { name: "Todo", type: "unstarted" } },
        relatedIssue: { id, identifier: `ENG-${id}`, title: "", url: "", state: { name: "Todo", type: "unstarted" } },
      })),
      pageInfo: page(more, more ? `${id}-cursor` : null),
    },
  };
}

// A fake Linear that pages every connection so the loader's cursors are exercised.
function fakeLinear(body: (call: Call) => unknown) {
  return vi.fn(async (_url: string, init: RequestInit) => {
    const call = JSON.parse(String(init.body)) as Call;
    calls.push(call);
    return { ok: true, status: 200, json: async () => ({ data: body(call) }) } as Response;
  });
}

beforeEach(() => {
  calls.length = 0;
  preferences.demoMode = false;
});
afterEach(() => vi.unstubAllGlobals());

describe("loadDashboard", () => {
  it("pages teams, projects, issues, and overflowing relations, and assembles projects per team", async () => {
    vi.stubGlobal(
      "fetch",
      fakeLinear(({ query, variables }) => {
        if (query.includes("LinearCommandCenterTeams")) {
          return variables.after
            ? {
                teams: {
                  nodes: [{ id: "t2", key: "OPS", name: "Ops", states: { nodes: [] } }],
                  pageInfo: page(false, null),
                },
              }
            : {
                teams: {
                  nodes: [{ id: "t1", key: "ENG", name: "Eng", states: { nodes: [] } }],
                  pageInfo: page(true, "teams-1"),
                },
              };
        }
        if (query.includes("LinearCommandCenterProjects")) {
          return variables.after
            ? {
                projects: {
                  nodes: [{ id: "p2", name: "Two", teams: { nodes: [{ id: "t1" }, { id: "t2" }] } }],
                  pageInfo: page(false, null),
                },
              }
            : {
                projects: {
                  nodes: [{ id: "p1", name: "One", teams: { nodes: [{ id: "t1" }] } }],
                  pageInfo: page(true, "projects-1"),
                },
              };
        }
        if (query.includes("LinearCommandCenterRelations")) {
          return {
            issue: {
              inverseRelations: {
                nodes: [
                  {
                    id: "1-r-blocker",
                    type: "blocks",
                    issue: {
                      id: "b",
                      identifier: "ENG-B",
                      title: "",
                      url: "",
                      state: { name: "Doing", type: "started" },
                    },
                    relatedIssue: {
                      id: "1",
                      identifier: "ENG-1",
                      title: "",
                      url: "",
                      state: { name: "Todo", type: "unstarted" },
                    },
                  },
                ],
                pageInfo: page(false, null),
              },
            },
          };
        }
        // dashboard pages: two pages of issues, one of the rest
        const second = Boolean(variables.issuesAfter);
        return {
          viewer: {
            id: "me",
            assignedIssues: {
              nodes: second ? [issue("2")] : [issue("1", 10, true)],
              pageInfo: second ? page(false, null) : page(true, "issues-1"),
            },
            delegatedIssues: { nodes: second ? [] : [{ id: "1" }], pageInfo: page(false, "delegated-end") },
          },
          agentSessions: { nodes: [], pageInfo: page(false, null) },
        };
      }),
    );

    const data = await loadDashboard();

    expect(data.teams.nodes.map((t) => t.key)).toEqual(["ENG", "OPS"]);
    expect(data.teams.nodes[0].projects.nodes.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(data.teams.nodes[1].projects.nodes.map((p) => p.id)).toEqual(["p2"]);
    expect(data.viewer.assignedIssues.nodes.map((i) => i.id)).toEqual(["1", "2"]);
    expect(data.viewer.delegatedIssues.nodes).toEqual([{ id: "1" }]);
    // the 11th relation, a blocker past the first page, was fetched
    const first = data.viewer.assignedIssues.nodes[0];
    expect(first.inverseRelations.nodes).toHaveLength(11);
    expect(first.inverseRelations.nodes.some((r) => r.type === "blocks")).toBe(true);
    expect(first.inverseRelations.pageInfo?.hasNextPage).toBe(false);

    const dashboardCalls = calls.filter((c) => c.query.includes("LinearCommandCenterDashboard"));
    expect(dashboardCalls).toHaveLength(2);
    expect(dashboardCalls[0].variables).toMatchObject({ first: 50 });
    expect(dashboardCalls[1].variables).toMatchObject({ issuesAfter: "issues-1", delegatedAfter: "delegated-end" });
    expect(calls.filter((c) => c.query.includes("LinearCommandCenterRelations"))[0].variables).toEqual({
      id: "1",
      after: "1-cursor",
    });
    for (const call of calls) expect((call as unknown as { headers?: unknown }).headers).toBeUndefined();
  });

  it("surfaces GraphQL errors as a thrown message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ errors: [{ message: "Query too complex" }] }),
      })),
    );
    await expect(loadDashboard()).rejects.toThrow("Query too complex");
  });

  it("serves demo data without touching the network", async () => {
    preferences.demoMode = true;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const data = await loadDashboard();
    expect(data.teams.nodes.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("writes in demo mode", () => {
  it("succeed locally and never call Linear", async () => {
    preferences.demoMode = true;
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(updateIssueState("demo-101", "demo-done")).resolves.toBeUndefined();
    await expect(addIssueComment("demo-101", "note")).resolves.toBeUndefined();
    await expect(createIssue({ teamId: "demo-team", title: "x", priority: 0 })).resolves.toMatchObject({
      identifier: expect.any(String),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("writes against Linear", () => {
  it("send the mutation with the bearer token and fail closed on success: false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        calls.push(JSON.parse(String(init.body)));
        expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-token");
        return { ok: true, status: 200, json: async () => ({ data: { issueUpdate: { success: false } } }) };
      }),
    );
    await expect(updateIssueState("i", "s")).rejects.toThrow("did not update");
    expect(calls[0].variables).toEqual({ id: "i", stateId: "s" });
  });
});
