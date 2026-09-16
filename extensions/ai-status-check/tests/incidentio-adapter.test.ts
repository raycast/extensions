import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createIncidentIoAdapter, parseIncidentIoSummary } from "../src/providers/adapters/incidentio";
import { assertProviderSnapshot } from "../src/domain/snapshot-validation";

test("invalid historical Incident.io timestamps preserve the current summary", async () => {
  const proxy = await fixture("proxy.json");
  const history = (await fixture("incidents.json")) as { incidents: { published_at: string }[] };
  history.incidents[0]!.published_at = "not-a-date";
  const snapshot = await createIncidentIoAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    fetchJson: async (url) => (url.endsWith("/incidents") ? history : url.includes("component_impacts") ? {} : proxy),
  }).fetch(new AbortController().signal);
  assertProviderSnapshot(snapshot, "example");
  assert.equal(snapshot.health, "degraded");
  assert.equal(snapshot.incidentHistoryAvailability, "unavailable");
});

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

test("failed or malformed history retains current Incident.io status and active incidents", async () => {
  for (const failure of [new Error("History unavailable"), { unexpected: [] }]) {
    const snapshot = await createIncidentIoAdapter({
      providerId: "example",
      statusPageUrl: "https://status.example.com/",
      fetchJson: async (url) => {
        if (url.endsWith("/incidents")) {
          if (failure instanceof Error) throw failure;
          return failure;
        }
        if (url.includes("component_impacts")) throw new Error("Chart unavailable");
        return {
          summary: {
            components: [{ id: "api", name: "API" }],
            affected_components: [],
            ongoing_incidents: [{ id: "active", name: "Investigating API errors", status: "investigating" }],
            structure: { items: [{ component: { component_id: "api", name: "API", display_uptime: true } }] },
          },
        };
      },
    }).fetch(new AbortController().signal);
    assert.equal(snapshot.incidents[0]?.id, "active");
    assert.equal(snapshot.incidentHistoryAvailability, "unavailable");
    assert.equal(snapshot.components[0]?.historyAvailability, "unavailable");
    assert.equal(snapshot.components[0]?.history, undefined);
  }
});

test("active Incident.io summary notices retain their official link and history updates", async () => {
  const notice = {
    id: "active",
    name: "API disruption",
    type: "incident",
    status: "investigating",
    published_at: "2026-09-10T10:00:00Z",
  };
  const snapshot = await createIncidentIoAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    fetchJson: async (url) => {
      if (url.endsWith("/incidents"))
        return {
          incidents: [
            {
              ...notice,
              updates: [
                {
                  id: "u",
                  to_status: "investigating",
                  message_string: "Investigating",
                  published_at: notice.published_at,
                },
              ],
            },
          ],
        };
      if (url.includes("component_impacts")) return {};
      return {
        summary: { components: [{ id: "api", name: "API" }], affected_components: [], ongoing_incidents: [notice] },
      };
    },
  }).fetch(new AbortController().signal);
  assert.equal(snapshot.incidents[0]?.url, "https://status.example.com/incidents/active");
  assert.equal(snapshot.incidents[0]?.updates.length, 1);
});

test("an Incident.io notice present only in the current summary still has an official incident link", async () => {
  const snapshot = await createIncidentIoAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    fetchJson: async (url) => {
      if (url.endsWith("/incidents")) return { incidents: [] };
      if (url.includes("component_impacts")) return {};
      return {
        summary: {
          components: [{ id: "api", name: "API" }],
          affected_components: [],
          ongoing_incidents: [{ id: "new", name: "New incident", status: "investigating" }],
        },
      };
    },
  }).fetch(new AbortController().signal);
  assert.equal(snapshot.incidents[0]?.url, "https://status.example.com/incidents/new");
});

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(await readFile(`tests/fixtures/incidentio/${name}`, "utf8")) as unknown;
}
