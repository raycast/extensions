import { describe, expect, it } from "vitest";
import {
  buildCustomWorkItemQuery,
  buildV2WorkItemQuery,
  nextV2Page,
  OPEN_STATE_GROUPS,
  toCustomDateRange,
  toPlaneDateParam,
} from "../src/helpers/work-item-queries";
import { buildVersionedApiUrl } from "../src/helpers/urls";
import { fromV2WorkItem, projectIdentifierFromKey } from "../src/helpers/work-item-summary";
import { filterMyWorkItems } from "../src/helpers/my-work-items";
import type { V2WorkItem } from "../src/api/types";

const ALL_PARAMS = [
  "assignees",
  "created_by",
  "mentions",
  "subscriber",
  "state",
  "state_group",
  "priority",
  "labels",
  "cycle",
  "module",
  "start_date",
  "target_date",
  "updated_at",
];

describe("custom v1 filter query", () => {
  it("sends `me` and comma-separated lists (OR within a param, no __in)", () => {
    const query = buildCustomWorkItemQuery(
      { assignees: ["me"], stateGroups: OPEN_STATE_GROUPS, priorities: ["urgent", "high"], labels: ["l1", "l2", "l1"] },
      ALL_PARAMS,
      { perPage: 100, orderBy: "-updated_at", expand: "state" },
    );
    expect(query).toMatchObject({
      assignees: "me",
      state_group: "backlog,unstarted,started",
      priority: "urgent,high",
      labels: "l1,l2",
      per_page: 100,
      order_by: "-updated_at",
      expand: "state",
    });
    expect(Object.keys(query).some((key) => key.includes("__"))).toBe(false);
  });

  it("supports `me` for every view param and `None`", () => {
    const query = buildCustomWorkItemQuery(
      { createdBy: ["me"], mentions: ["me"], subscriber: ["me"], assignees: ["None"] },
      ALL_PARAMS,
    );
    expect(query).toMatchObject({ created_by: "me", mentions: "me", subscriber: "me", assignees: "None" });
  });

  it("formats date ranges as YYYY-MM-DD;after,YYYY-MM-DD;before", () => {
    const query = buildCustomWorkItemQuery(
      {
        targetDate: { after: new Date(2026, 9, 1), before: new Date(2026, 9, 31) },
        startDate: { before: "2026-12-01" },
        updatedAt: { after: "2026-10-01" },
      },
      ALL_PARAMS,
    );
    expect(query.target_date).toBe("2026-10-01;after,2026-10-31;before");
    expect(query.start_date).toBe("2026-12-01;before");
    expect(query.updated_at).toBe("2026-10-01;after");
  });

  it("keeps the picked calendar day for local dates (any time zone)", () => {
    expect(toPlaneDateParam(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(toPlaneDateParam(new Date(2026, 0, 1, 23, 59))).toBe("2026-01-01");
    expect(toPlaneDateParam("2026-1-1")).toBeUndefined();
    expect(toCustomDateRange({})).toBeUndefined();
  });

  it("sends only params the server advertised", () => {
    const query = buildCustomWorkItemQuery(
      { assignees: ["me"], stateGroups: ["started"], priorities: ["high"], targetDate: { after: "2026-10-01" } },
      ["assignees", "state_group"],
      { perPage: 1 },
    );
    expect(query.assignees).toBe("me");
    expect(query.state_group).toBe("started");
    expect(query).not.toHaveProperty("priority");
    expect(query).not.toHaveProperty("target_date");
  });

  it("builds the workspace URL", () => {
    const query = buildCustomWorkItemQuery({ assignees: ["me"] }, ["assignees"], { perPage: 1 });
    expect(buildVersionedApiUrl("https://plane.example.com/api/v1/", "v1", "workspaces/acme/work-items", query)).toBe(
      "https://plane.example.com/api/v1/workspaces/acme/work-items/?assignees=me&per_page=1",
    );
  });
});

describe("v2 query", () => {
  it("uses the exact name for one value and __in for several", () => {
    const query = buildV2WorkItemQuery(
      { assigneeIds: ["user-1"], stateGroups: ["backlog", "unstarted", "started"], priorities: ["urgent"] },
      { perPage: 100, paginate: "cursor", orderBy: "-updated_at", expand: "state" },
    );
    expect(query).toMatchObject({
      assignee_id: "user-1",
      state_group__in: "backlog,unstarted,started",
      priority: "urgent",
      per_page: 100,
      paginate: "cursor",
      order_by: "-updated_at",
      expand: "state",
    });
    expect(query).not.toHaveProperty("assignee_id__in");
  });

  it("maps date ranges to __gte / __lte with plain dates", () => {
    const query = buildV2WorkItemQuery({
      targetDate: { after: new Date(2026, 0, 1), before: "2026-03-31" },
      startDate: { after: "2026-01-12" },
    });
    expect(query.target_date__gte).toBe("2026-01-01");
    expect(query.target_date__lte).toBe("2026-03-31");
    expect(query.start_date__gte).toBe("2026-01-12");
    expect(query.start_date__lte).toBeUndefined();
  });

  it("drops paginate on follow-up pages and keeps every filter", () => {
    const query = buildV2WorkItemQuery(
      { assigneeIds: ["user-1"] },
      { paginate: "cursor", cursor: "b3A9MTcx", orderBy: "-updated_at" },
    );
    expect(query).toMatchObject({ assignee_id: "user-1", cursor: "b3A9MTcx", order_by: "-updated_at" });
    expect(query.paginate).toBeUndefined();
  });

  it("follows both pagination styles", () => {
    expect(nextV2Page({ pagination: { style: "cursor" }, has_more: true, next_cursor: "abc" })).toEqual({
      cursor: "abc",
    });
    expect(nextV2Page({ pagination: { style: "cursor" }, has_more: false, next_cursor: null })).toBeUndefined();
    expect(nextV2Page({ pagination: { style: "offset" }, next: 50 })).toEqual({ offset: 50 });
    expect(nextV2Page({ pagination: { style: "offset" }, next: null })).toBeUndefined();
  });
});

describe("v2 → WorkItemSummary", () => {
  const me = "16c61a3a-512a-48ac-b0be-b6b46fe6f430";
  const row: V2WorkItem = {
    id: "8f4c2b1e",
    name: "Fix login redirect loop",
    identifier: "PROJ-142",
    sequence_id: 142,
    priority: "high",
    project_id: "4af68566",
    state_id: "f960d3c2",
    assignee_ids: [me],
    label_ids: ["c1b8f3d6"],
    start_date: "2026-01-12",
    target_date: "2026-01-20",
    created_at: "2026-01-14T09:22:41.478363Z",
    updated_at: "2026-01-15T10:03:17.220981Z",
    created_by_id: me,
    state: { id: "f960d3c2", name: "In Progress", color: "#3f76ff", group: "started" },
  };

  it("maps ids, expanded state and project", () => {
    const projects = new Map([["4af68566", { identifier: "PROJ", name: "Project" }]]);
    const summary = fromV2WorkItem(row, { workspaceSlug: "my-team", projects });
    expect(summary).toMatchObject({
      id: "8f4c2b1e",
      name: "Fix login redirect loop",
      projectId: "4af68566",
      projectIdentifier: "PROJ",
      projectName: "Project",
      sequenceId: 142,
      workspaceSlug: "my-team",
      stateId: "f960d3c2",
      state: { name: "In Progress", group: "started" },
      priority: "high",
      assigneeIds: [me],
      labelIds: ["c1b8f3d6"],
      createdBy: me,
      startDate: "2026-01-12",
      targetDate: "2026-01-20",
      updatedAt: "2026-01-15T10:03:17.220981Z",
    });
    // The existing client-side helpers work on the mapped shape.
    expect(filterMyWorkItems([summary], me, "assigned")).toHaveLength(1);
    expect(filterMyWorkItems([summary], me, "created")).toHaveLength(1);
  });

  it("falls back to the identifier's project key and tolerates missing optional keys", () => {
    const summary = fromV2WorkItem(
      { id: "x", name: "Bare", identifier: "MKT-37", sequence_id: 37, project_id: "p2" },
      { workspaceSlug: "my-team" },
    );
    expect(summary.projectIdentifier).toBe("MKT");
    expect(summary.assigneeIds).toEqual([]);
    expect(summary.labelIds).toEqual([]);
    expect(summary.state).toBeUndefined();
    expect(summary.stateId).toBeNull();
  });

  it("parses project keys", () => {
    expect(projectIdentifierFromKey("ENG-12")).toBe("ENG");
    expect(projectIdentifierFromKey("A1-B-7")).toBe("A1-B");
    expect(projectIdentifierFromKey("nope")).toBeUndefined();
  });
});
