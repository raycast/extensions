import assert from "node:assert/strict";
import test from "node:test";
import { deriveProviderHealth, highestHealth } from "../src/domain/derive-health";
import type { ComponentStatus, Incident } from "../src/domain/types";

test("highestHealth returns the most severe known status", () => {
  assert.equal(highestHealth(["operational", "degraded", "unknown", "partial_outage"]), "partial_outage");
  assert.equal(highestHealth(["unknown"]), "unknown");
});

test("uses a provider-published overall status without overriding it", () => {
  const components: ComponentStatus[] = [{ id: "api", name: "API", health: "operational" }];
  const activeIncident: Incident = {
    id: "incident",
    title: "Outage under observation",
    health: "major_outage",
    state: "monitoring",
    affectedComponentIds: ["api"],
    updates: [],
  };

  assert.equal(deriveProviderHealth("operational", components, [activeIncident]), "operational");
  assert.equal(deriveProviderHealth("partial_outage", components, []), "partial_outage");
});

test("aggregates components and incidents only when no overall status is published", () => {
  const scheduled: Incident = {
    id: "maintenance",
    title: "Scheduled maintenance",
    health: "unknown",
    state: "scheduled",
    affectedComponentIds: [],
    updates: [],
  };

  assert.equal(deriveProviderHealth("unknown", [], [scheduled]), "maintenance");
  assert.equal(
    deriveProviderHealth("unknown", [{ id: "api", name: "API", health: "partial_outage" }], [scheduled]),
    "partial_outage",
  );
});
