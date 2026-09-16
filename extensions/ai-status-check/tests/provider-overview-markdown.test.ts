import assert from "node:assert/strict";
import test from "node:test";
import type { ComponentStatus, ProviderStatusRecord } from "../src/domain/types";
import { buildProviderOverviewMarkdown } from "../src/utils/provider-overview-markdown";

test("keeps unfamiliar component states visible without claiming they are healthy", () => {
  const unknown: ComponentStatus = {
    id: "api",
    name: "API",
    health: "unknown",
    statusText: "Overload detected",
  };
  for (const components of [
    [unknown],
    [unknown, { id: "web", name: "Web", health: "operational" as const }],
    [unknown, { id: "batch", name: "Batch", health: "degraded" as const }],
  ]) {
    const markdown = buildProviderOverviewMarkdown(record(components))!;
    assert.match(markdown, /API — Overload detected/);
    assert.match(markdown, /Component Status/);
    assert.doesNotMatch(markdown, /No component issues reported/);
  }
});

test("distinguishes operational components from missing component data", () => {
  const operational = record([{ id: "api", name: "API", health: "operational" }]);
  assert.match(buildProviderOverviewMarkdown(operational)!, /No component issues reported/);
  const missing = buildProviderOverviewMarkdown(record([]))!;
  assert.match(missing, /Component data is unavailable/);
  assert.doesNotMatch(missing, /No component issues reported/);
});

function record(components: ComponentStatus[]): ProviderStatusRecord {
  return {
    providerId: "provider",
    freshness: "fresh",
    refreshState: "idle",
    snapshot: {
      providerId: "provider",
      health: "operational",
      components,
      incidents: [],
      fetchedAt: "2026-09-10T16:00:00Z",
    },
  };
}
