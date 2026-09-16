import assert from "node:assert/strict";
import test from "node:test";
import type { Incident } from "../src/domain/types";
import { incidentActivityTime, mergeIncidents } from "../src/domain/incidents";

const earlier = "2026-09-10T10:00:00Z";
const later = "2026-09-10T10:05:00Z";

test("a stale current summary cannot revive a more recently resolved incident", () => {
  const history = incident({ state: "resolved", resolvedAt: later, updatedAt: later });
  const summary = incident({ state: "investigating", updatedAt: earlier });
  assert.equal(mergeIncidents([history], [summary])[0]?.state, "resolved");
});

test("incident reconciliation retains missing links, metadata and timeline updates", () => {
  const history = incident({
    url: "https://status.example.com/incidents/i",
    startedAt: earlier,
    stateText: "Investigating",
    updates: [{ id: "u", state: "investigating", body: "Investigating failures", createdAt: earlier }],
  });
  const summary = incident({ state: "monitoring", updatedAt: later, url: undefined });
  const result = mergeIncidents([history], [summary])[0]!;
  assert.equal(result.url, history.url);
  assert.equal(result.startedAt, earlier);
  assert.equal(result.updates.length, 1);
  assert.equal(result.state, "monitoring");
  assert.equal(result.stateText, undefined);
});

test("a reopened incident clears its previous resolved timestamp", () => {
  const result = mergeIncidents(
    [incident({ state: "resolved", resolvedAt: earlier, updatedAt: earlier })],
    [incident({ state: "investigating", updatedAt: later })],
  )[0]!;
  assert.equal(result.state, "investigating");
  assert.equal(result.resolvedAt, undefined);
});

test("post-resolution updates determine latest activity and matching updates appear once", () => {
  const update = { id: "postmortem", state: "resolved" as const, body: "Postmortem published", createdAt: later };
  const history = incident({ state: "resolved", resolvedAt: earlier, updates: [update] });
  const summary = incident({
    state: "resolved",
    resolvedAt: earlier,
    updates: [{ ...update, id: "another-source-id" }],
  });
  assert.equal(incidentActivityTime(history), Date.parse(later));
  assert.equal(mergeIncidents([history], [summary])[0]?.updates.length, 1);
});

function incident(fields: Partial<Incident> = {}): Incident {
  return {
    id: "i",
    title: "API disruption",
    health: "degraded",
    state: "investigating",
    affectedComponentIds: [],
    updates: [],
    ...fields,
  };
}
