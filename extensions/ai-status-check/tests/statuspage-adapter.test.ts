import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createStatuspageAdapter, statuspageEndpoints } from "../src/providers/adapters/statuspage";
import { parseSummary } from "../src/providers/parsers/statuspage";
import { mapFlexibleHealth } from "../src/providers/utils/status-normalization";

test("normalizes components and incident history from Statuspage-compatible payloads", async () => {
  const summary = await fixture("summary-degraded.json");
  const incidents = await fixture("incidents.json");
  const maintenances = { scheduled_maintenances: [] };
  const requestedUrls: string[] = [];
  const adapter = createStatuspageAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    fetchJson: async (url) => {
      requestedUrls.push(url);
      if (url.includes("summary")) return summary;
      return url.includes("scheduled-maintenances") ? maintenances : incidents;
    },
    now: () => new Date("2026-08-11T16:00:00Z"),
  });

  const snapshot = await adapter.fetch(new AbortController().signal);

  assert.deepEqual(requestedUrls.sort(), [
    "https://status.example.com/api/v2/incidents.json",
    "https://status.example.com/api/v2/scheduled-maintenances.json",
    "https://status.example.com/api/v2/summary.json",
  ]);
  assert.equal(snapshot.providerId, "example");
  assert.equal(snapshot.health, "degraded");
  assert.equal(snapshot.fetchedAt, "2026-08-11T16:00:00.000Z");
  assert.equal(snapshot.components[1]?.name, "Code Assistant");
  assert.equal(snapshot.components[1]?.health, "degraded");
  assert.equal(snapshot.components[1]?.statusText, "degraded_performance");
  assert.equal(snapshot.incidents[0]?.id, "active-incident");
  assert.equal(snapshot.incidents[0]?.stateText, "investigating");
  assert.equal(snapshot.incidents[0]?.impactText, "minor");
  assert.equal(snapshot.incidents[0]?.url, "https://stspg.io/example");
  assert.deepEqual(snapshot.incidents[0]?.affectedComponentIds, ["code"]);
  assert.equal(snapshot.incidents[0]?.updates[0]?.body, "We are investigating elevated latency.");
  assert.equal(snapshot.incidents[0]?.updates[0]?.stateText, "investigating");
});

test("derives framework endpoints and permits narrow overrides", () => {
  assert.deepEqual(statuspageEndpoints("https://status.example.com/"), {
    summary: "https://status.example.com/api/v2/summary.json",
    incidents: "https://status.example.com/api/v2/incidents.json",
    maintenances: "https://status.example.com/api/v2/scheduled-maintenances.json",
  });
  assert.deepEqual(statuspageEndpoints("https://status.example.com/", { summary: "https://api.example.com/current" }), {
    summary: "https://api.example.com/current",
    incidents: "https://status.example.com/api/v2/incidents.json",
    maintenances: "https://status.example.com/api/v2/scheduled-maintenances.json",
  });
});

test("keeps an explicitly impact-free active incident separate from operational system status", async () => {
  const summary = await fixture("summary-operational.json");
  const adapter = createStatuspageAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    fetchJson: async (url) => {
      if (url.includes("summary")) return summary;
      if (url.includes("scheduled-maintenances")) return { scheduled_maintenances: [] };
      return {
        incidents: [
          {
            id: "active-without-impact",
            name: "Requests are failing",
            status: "identified",
            impact: "none",
            created_at: "2026-08-11T15:00:00Z",
            updated_at: "2026-08-11T15:05:00Z",
          },
        ],
      };
    },
  });

  const snapshot = await adapter.fetch(new AbortController().signal);

  assert.equal(snapshot.health, "operational");
  assert.equal(snapshot.statusText, "All Systems Operational");
  assert.equal(snapshot.incidents[0]?.state, "identified");
  assert.equal(snapshot.incidents[0]?.stateText, "identified");
  assert.equal(snapshot.incidents[0]?.impactText, "none");
});

test("normalizes operational status", async () => {
  const summary = await fixture("summary-operational.json");
  const parsed = parseSummary(summary);

  assert.equal(parsed.reportedHealth, "operational");
  assert.deepEqual(
    parsed.components.map((component) => component.id),
    ["api", "code"],
  );
});

test("filters incidents together with components for shared platform status pages", async () => {
  const summary = await fixture("summary-degraded.json");
  const incidents = await fixture("incidents.json");
  const adapter = createStatuspageAdapter({
    providerId: "filtered-example",
    statusPageUrl: "https://status.example.com/",
    componentFilter: (component) => component.id === "api",
    incidentFilter: (incident) => incident.affectedComponentIds.includes("api"),
    fetchJson: async (url) => {
      if (url.includes("summary")) return summary;
      return url.includes("scheduled-maintenances") ? { scheduled_maintenances: [] } : incidents;
    },
  });

  const snapshot = await adapter.fetch(new AbortController().signal);

  assert.deepEqual(
    snapshot.components.map((component) => component.id),
    ["api"],
  );
  assert.deepEqual(snapshot.incidents, []);
  assert.equal(snapshot.health, "operational");
  assert.equal(snapshot.statusText, undefined);
});

test("rejects malformed summaries instead of reporting them operational", () => {
  assert.throws(() => parseSummary({ components: [] }), /Invalid status summary status response/);
});

test("maps known source states and keeps unfamiliar states unknown", () => {
  assert.equal(mapFlexibleHealth("degraded_performance"), "degraded");
  assert.equal(mapFlexibleHealth("full_outage"), "major_outage");
  assert.equal(mapFlexibleHealth("new-provider-state"), "unknown");
});

async function fixture(name: string): Promise<unknown> {
  const contents = await readFile(`tests/fixtures/statuspage/${name}`, "utf8");
  return JSON.parse(contents) as unknown;
}
