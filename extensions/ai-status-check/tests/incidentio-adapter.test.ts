import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createIncidentIoAdapter } from "../src/providers/adapters/incidentio";
import { parseIncidentIoSummary } from "../src/providers/parsers/incidentio";

test("uses the Incident.io proxy structure and affected component states", async () => {
  const proxy = await fixture("proxy.json");
  const incidents = await fixture("incidents.json");
  const requestedUrls: string[] = [];
  const adapter = createIncidentIoAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    fetchJson: async (url) => {
      requestedUrls.push(url);
      return url.endsWith("/incidents") ? incidents : proxy;
    },
    now: () => new Date("2026-08-11T16:00:00Z"),
  });

  const snapshot = await adapter.fetch(new AbortController().signal);

  assert.deepEqual(requestedUrls.sort(), [
    "https://status.example.com/proxy/status.example.com",
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
});

test("supports framework endpoint and parser overrides without provider-specific branches", async () => {
  const requestedUrls: string[] = [];
  let parsedSummary = false;
  let parsedIncidents = false;
  const adapter = createIncidentIoAdapter({
    providerId: "variant",
    statusPageUrl: "https://status.variant.example/",
    proxyUrl: "https://api.variant.example/current",
    incidentsUrl: "https://api.variant.example/history",
    fetchJson: async (url) => {
      requestedUrls.push(url);
      return {};
    },
    parseSummary: () => {
      parsedSummary = true;
      return {
        reportedHealth: "operational",
        components: [{ id: "api", name: "API", health: "operational" }],
        incidents: [],
      };
    },
    parseIncidents: () => {
      parsedIncidents = true;
      return [];
    },
  });

  const snapshot = await adapter.fetch(new AbortController().signal);

  assert.deepEqual(requestedUrls.sort(), [
    "https://api.variant.example/current",
    "https://api.variant.example/history",
  ]);
  assert.equal(parsedSummary, true);
  assert.equal(parsedIncidents, true);
  assert.deepEqual(
    snapshot.components.map((component) => component.id),
    ["api"],
  );
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
