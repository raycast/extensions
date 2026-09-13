import assert from "node:assert/strict";
import test from "node:test";
import { buildComponentSections, getActiveIncidents, getRecentIncidents } from "../src/domain/provider-view";
import type { ComponentStatus, Incident } from "../src/domain/types";

test("groups components by their published group without losing ungrouped services", () => {
  const components: ComponentStatus[] = [
    { id: "api", name: "API", group: "Platform", health: "operational" },
    { id: "batch", name: "Batch", group: "Platform", health: "degraded" },
    { id: "site", name: "Status Site", health: "operational" },
  ];

  const sections = buildComponentSections(components);

  assert.deepEqual(
    sections.groups.map((group) => ({
      name: group.name,
      ids: group.components.map((item) => item.id),
    })),
    [{ name: "Platform", ids: ["api", "batch"] }],
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

test("orders recent incidents by latest activity before applying the ten-incident limit", () => {
  const now = Date.parse("2026-09-10T16:00:00Z");
  const incidents = Array.from({ length: 10 }, (_, index) =>
    incident(`recent-${index}`, "resolved", new Date(now - (index + 1) * 86_400_000).toISOString()),
  );
  incidents.push({
    ...incident("just-resolved", "resolved", "2026-07-01T00:00:00Z"),
    resolvedAt: new Date(now - 60_000).toISOString(),
  });
  const result = getRecentIncidents(incidents, now);
  assert.equal(result[0]?.id, "just-resolved");
  assert.equal(result.length, 10);
  assert.equal(incidents.at(-1)?.id, "just-resolved");
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
