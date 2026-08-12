import assert from "node:assert/strict";
import test from "node:test";
import {
  componentStatusPresentation,
  incidentActivityLabel,
  incidentImpactLabel,
  incidentStateLabel,
  incidentUpdateStateLabel,
  providerStatusPresentation,
  providerUpdatedLabel,
} from "../src/domain/status-presentation";
import type { ComponentStatus, Incident, IncidentUpdate, ProviderStatusRecord } from "../src/domain/types";

const now = Date.parse("2026-08-11T16:00:00Z");

test("shows only the latest incident activity time", () => {
  assert.equal(incidentActivityLabel(incident("investigating", "2026-04-29T16:00:00Z"), now), "updated 104 days ago");
  assert.equal(incidentActivityLabel(incident("scheduled", "2026-08-10T16:00:00Z"), now), "updated yesterday");
  assert.equal(incidentActivityLabel(incident("resolved", "2026-08-10T16:00:00Z"), now), "updated yesterday");
});

test("prefers the provider's published incident impact language", () => {
  const published = { ...incident("identified", "2026-08-11T15:00:00Z"), impactText: "none" };
  assert.equal(incidentImpactLabel(published), "None");

  const unpublished = incident("identified", "2026-08-11T15:00:00Z");
  assert.equal(incidentImpactLabel(unpublished), undefined);
});

test("maps known provider status aliases to one label and icon health", () => {
  const snapshot = providerRecord().snapshot!;

  for (const statusText of [
    "operational",
    "UP",
    "all system operational",
    "All Systems Operational",
    "fully_operational",
    "No incidents declared",
  ]) {
    assert.deepEqual(providerStatusPresentation({ ...snapshot, health: "unknown", statusText }), {
      label: "All Systems Operational",
      health: "operational",
    });
  }

  assert.equal(providerStatusPresentation({ ...snapshot, health: "operational" }).label, "All Systems Operational");
});

test("preserves unknown provider and component wording exactly", () => {
  const snapshot = providerRecord().snapshot!;
  assert.equal(
    providerStatusPresentation({ ...snapshot, health: "unknown", statusText: "Elevated failure rate" }).label,
    "Elevated failure rate",
  );
  assert.equal(providerStatusPresentation({ ...snapshot, health: "partial_outage" }).label, "Partial Outage");

  const component: ComponentStatus = {
    id: "api",
    name: "API",
    health: "major_outage",
    statusText: "critical_issue",
  };
  assert.equal(componentStatusPresentation(component).label, "critical_issue");
  assert.equal(componentStatusPresentation(component).health, "major_outage");
  assert.equal(componentStatusPresentation({ ...component, statusText: undefined }).label, "Major Outage");
});

test("uses component-specific canonical labels for known health aliases", () => {
  const component: ComponentStatus = { id: "api", name: "API", health: "unknown", statusText: "UP" };
  assert.deepEqual(componentStatusPresentation(component), { label: "Operational", health: "operational" });
  assert.deepEqual(componentStatusPresentation({ ...component, statusText: "degraded_performance" }), {
    label: "Degraded Performance",
    health: "degraded",
  });
});

test("normalizes known incident states and preserves unfamiliar wording", () => {
  assert.equal(
    incidentStateLabel({ ...incident("monitoring", "2026-08-11T15:00:00Z"), stateText: "MONITORING" }),
    "Monitoring",
  );

  const published = { ...incident("unknown", "2026-08-11T15:00:00Z"), stateText: "MITIGATION_IN_PROGRESS" };
  assert.equal(incidentStateLabel(published), "MITIGATION_IN_PROGRESS");

  const update: IncidentUpdate = {
    id: "update",
    state: "monitoring",
    stateText: "Watching recovery",
    body: "Recovery is continuing.",
    createdAt: "2026-08-11T15:00:00Z",
  };
  assert.equal(incidentUpdateStateLabel(update), "Watching recovery");
});

test("shows provider timing only as an updated label", () => {
  const record = providerRecord();
  assert.equal(providerUpdatedLabel(record.snapshot!, now), "updated now");
});

function incident(state: Incident["state"], updatedAt: string): Incident {
  return {
    id: state,
    title: state,
    health: state === "resolved" ? "operational" : "degraded",
    state,
    updatedAt,
    affectedComponentIds: [],
    updates: [],
  };
}

function providerRecord(): ProviderStatusRecord {
  return {
    providerId: "provider",
    freshness: "fresh",
    refreshState: "idle",
    snapshot: {
      providerId: "provider",
      health: "operational",
      components: [],
      incidents: [],
      fetchedAt: "2026-08-11T16:00:00Z",
    },
  };
}
