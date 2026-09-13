import assert from "node:assert/strict";
import test from "node:test";
import type { Health, ProviderStatusRecord } from "../src/domain/types";
import type { ProviderDefinition } from "../src/providers/types";
import { buildProviderSections, unavailableProviderRecord } from "../src/providers/provider-sections";

test("uses one ordering policy for every provider", () => {
  const providers = [provider("healthy"), provider("issue"), provider("maintenance"), provider("missing")];
  const records = {
    healthy: record("healthy", "operational"),
    issue: record("issue", "degraded"),
    maintenance: record("maintenance", "maintenance"),
    missing: unavailableProviderRecord("missing"),
  };

  const sections = buildProviderSections(providers, records);

  assert.deepEqual(
    sections.map((section) => ({ id: section.id, providers: section.providers.map((item) => item.id) })),
    [
      { id: "issues", providers: ["issue"] },
      { id: "maintenance", providers: ["maintenance"] },
      { id: "model-providers", providers: ["healthy"] },
      { id: "unavailable", providers: ["missing"] },
    ],
  );
});

test("keeps a fresh provider without overall status available and sorts its active incidents", () => {
  const providers = [provider("quiet"), provider("incident")];
  const quiet = record("quiet", "unknown");
  const incident = record("incident", "unknown");
  incident.snapshot!.incidents = [
    {
      id: "active",
      title: "Published incident",
      health: "major_outage",
      state: "investigating",
      affectedComponentIds: [],
      updates: [],
    },
  ];

  const sections = buildProviderSections(providers, { quiet, incident });

  assert.deepEqual(
    sections.map((section) => ({ id: section.id, providers: section.providers.map((item) => item.id) })),
    [
      { id: "issues", providers: ["incident"] },
      { id: "model-providers", providers: ["quiet"] },
    ],
  );
});

function provider(id: string): ProviderDefinition {
  return {
    id,
    name: id,
    aliases: [],
    category: "model-providers",
    preferenceKey: `show-${id}`,
    icon: `provider-icons/${id}.png`,
    statusPageUrl: `https://status.${id}.example/`,
    adapter: { fetch: async () => record(id, "operational").snapshot! },
  };
}

function record(providerId: string, health: Health): ProviderStatusRecord {
  return {
    providerId,
    freshness: "fresh",
    refreshState: "idle",
    snapshot: {
      providerId,
      health,
      components: [],
      incidents: [],
      fetchedAt: "2026-08-11T16:00:00Z",
    },
  };
}
