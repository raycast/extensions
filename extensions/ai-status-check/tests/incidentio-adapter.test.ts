import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createIncidentIoAdapter, parseIncidentIoSummary } from "../src/providers/adapters/incidentio";

test("uses the Incident.io proxy structure and affected component states", async () => {
  const proxy = await fixture("proxy.json");
  const incidents = await fixture("incidents.json");
  const impacts = await fixture("component-impacts.json");
  const requestedUrls: string[] = [];
  const adapter = createIncidentIoAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    fetchJson: async (url) => {
      requestedUrls.push(url);
      if (url.includes("component_impacts")) return impacts;
      return url.endsWith("/incidents") ? incidents : proxy;
    },
    now: () => new Date("2026-08-11T16:00:00Z"),
  });

  const snapshot = await adapter.fetch(new AbortController().signal);

  assert.deepEqual(requestedUrls.sort(), [
    "https://status.example.com/proxy/status.example.com",
    "https://status.example.com/proxy/status.example.com/component_impacts?start_at=2026-08-09T00%3A00%3A00.000Z&end_at=2026-08-11T23%3A59%3A59.999Z",
    "https://status.example.com/proxy/status.example.com/incidents",
  ]);
  assert.equal(snapshot.health, "degraded");
  assert.equal(snapshot.statusText, "We're currently experiencing issues");
  assert.equal(snapshot.fetchedAt, "2026-08-11T16:00:00.000Z");
  assert.deepEqual(
    snapshot.components.map(({ id, name, group, health, statusText }) => ({
      id,
      name,
      group,
      health,
      statusText,
    })),
    [
      {
        id: "chat",
        name: "Chat",
        group: "Endpoints",
        health: "operational",
        statusText: undefined,
      },
      {
        id: "embed",
        name: "Embed",
        group: "Models",
        health: "degraded",
        statusText: "degraded_performance",
      },
      {
        id: "docs",
        name: "Docs",
        group: undefined,
        health: "operational",
        statusText: undefined,
      },
    ],
  );
  assert.equal(snapshot.incidents[0]?.id, "active-incident");
  assert.deepEqual(snapshot.components[1]?.history, {
    basis: "availability",
    windowDays: 3,
    days: [
      { date: "2026-08-09", level: "operational" },
      { date: "2026-08-10", level: "degraded" },
      { date: "2026-08-11", level: "operational" },
    ],
    uptimePercent: 99.5,
    uptimeText: "99.50%",
    monitoredSince: "2026-08-01",
  });
  assert.equal(snapshot.components[2]?.history, undefined);
});

test("supports framework endpoint overrides without provider-specific branches", async () => {
  const proxy = await fixture("proxy.json");
  const incidents = await fixture("incidents.json");
  const impacts = await fixture("component-impacts.json");
  const requestedUrls: string[] = [];
  const adapter = createIncidentIoAdapter({
    providerId: "variant",
    statusPageUrl: "https://status.variant.example/",
    proxyUrl: "https://api.variant.example/current",
    incidentsUrl: "https://api.variant.example/history",
    componentImpactsUrl: "https://api.variant.example/uptime",
    fetchJson: async (url) => {
      requestedUrls.push(url);
      if (url.endsWith("/uptime")) return impacts;
      return url.endsWith("/history") ? incidents : proxy;
    },
  });

  const snapshot = await adapter.fetch(new AbortController().signal);

  assert.deepEqual(requestedUrls.sort(), [
    "https://api.variant.example/current",
    "https://api.variant.example/history",
    "https://api.variant.example/uptime",
  ]);
  assert.equal(snapshot.components.length, 3);
});

test("treats an empty affected component list as Incident.io operational state", async () => {
  const payload = (await fixture("proxy.json")) as { summary: { affected_components: unknown[] } };
  payload.summary.affected_components = [];

  const parsed = parseIncidentIoSummary(payload);

  assert.equal(parsed.reportedHealth, "operational");
  assert.ok(parsed.components.every((component) => component.health === "operational"));
  assert.ok(parsed.components.every((component) => component.statusText === undefined));
});

test("does not collapse an unfamiliar affected status into operational", async () => {
  const payload = (await fixture("proxy.json")) as {
    summary: { affected_components: Array<{ component_status: string }> };
  };
  payload.summary.affected_components[0]!.component_status = "new_incident_io_state";

  const parsed = parseIncidentIoSummary(payload);

  assert.equal(parsed.reportedHealth, "unknown");
  assert.equal(parsed.components[1]?.health, "unknown");
  assert.equal(parsed.components[1]?.statusText, "new_incident_io_state");
});

test("falls back to the proxy component catalog when structure is unavailable", async () => {
  const payload = (await fixture("proxy.json")) as { summary: { structure?: unknown } };
  delete payload.summary.structure;

  assert.deepEqual(
    parseIncidentIoSummary(payload).components.map((component) => component.id),
    ["chat", "embed", "docs"],
  );
});

test("uses an empty published structure without restoring unlisted components", async () => {
  const payload = (await fixture("proxy.json")) as { summary: { structure: { items: unknown[] } } };
  payload.summary.structure.items = [];

  assert.deepEqual(parseIncidentIoSummary(payload).components, []);
});

test("rejects malformed Incident.io proxy responses", () => {
  assert.throws(() => parseIncidentIoSummary({}), /Invalid Incident.io proxy summary response/);
  assert.throws(
    () => parseIncidentIoSummary({ summary: { components: [], structure: { items: [] } } }),
    /contained no components/,
  );
});

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(`tests/fixtures/incidentio/${name}`, "utf8")) as unknown;
}
