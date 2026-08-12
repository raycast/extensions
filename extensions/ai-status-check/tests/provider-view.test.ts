import assert from "node:assert/strict";
import test from "node:test";
import { buildComponentSections, getActiveIncidents, getRecentIncidents } from "../src/domain/provider-view";
import type { ComponentStatus, Incident } from "../src/domain/types";

test("builds one shared component hierarchy with aggregate group health", () => {
  const components: ComponentStatus[] = [
    { id: "api", name: "API", group: "Platform", health: "operational" },
    { id: "batch", name: "Batch", group: "Platform", health: "degraded" },
    { id: "site", name: "Status Site", health: "operational" },
  ];

  const sections = buildComponentSections(components);

  assert.deepEqual(
    sections.groups.map((group) => ({
      name: group.name,
      health: group.health,
      affectedCount: group.affectedCount,
      ids: group.components.map((item) => item.id),
    })),
    [{ name: "Platform", health: "degraded", affectedCount: 1, ids: ["api", "batch"] }],
  );
  assert.deepEqual(
    sections.ungrouped.map((component) => component.id),
    ["site"],
  );
});

test("selects active and recent incidents with the shared history policy", () => {
  const now = Date.parse("2026-08-11T16:00:00Z");
  const incidents = [
    incident("active", "investigating", "2026-08-11T15:00:00Z"),
    incident("recent", "resolved", "2026-08-01T15:00:00Z"),
    incident("old", "resolved", "2026-06-01T15:00:00Z"),
    incident("undated", "resolved"),
  ];

  assert.deepEqual(
    getActiveIncidents(incidents).map((item) => item.id),
    ["active"],
  );
  assert.deepEqual(
    getRecentIncidents(incidents, now).map((item) => item.id),
    ["recent", "undated"],
  );
});

test("keeps long-running incidents when they were resolved recently", () => {
  const now = Date.parse("2026-08-11T16:00:00Z");
  const longRunning = {
    ...incident("long-running", "resolved", "2026-06-16T15:00:00Z"),
    resolvedAt: "2026-07-23T15:00:00Z",
  };

  assert.deepEqual(
    getRecentIncidents([longRunning], now).map((item) => item.id),
    ["long-running"],
  );
});

function incident(id: string, state: Incident["state"], startedAt?: string): Incident {
  return {
    id,
    title: id,
    health: state === "resolved" ? "operational" : "degraded",
    state,
    startedAt,
    affectedComponentIds: [],
    updates: [],
  };
}
