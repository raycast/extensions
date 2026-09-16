import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createStatuspageAdapter,
  parseStatuspageUptimeHtml,
  parseSummary,
  statuspageEndpoints,
} from "../src/providers/adapters/statuspage";
import { mapFlexibleHealth } from "../src/providers/utils/status-normalization";
import { RequestTimeoutError } from "../src/utils/request-timeout";
import { refreshProviderStatus } from "../src/services/fetch-provider-statuses";
import { SnapshotCache } from "../src/services/status-cache";

test("normalizes components and incident history from Statuspage-compatible payloads", async () => {
  const summary = await fixture("summary-degraded.json");
  const incidents = await fixture("incidents.json");
  const maintenances = { scheduled_maintenances: [] };
  const requestedUrls: string[] = [];
  const uptimeHtml = await textFixture("uptime.html");
  const adapter = createStatuspageAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    fetchJson: async (url) => {
      requestedUrls.push(url);
      if (url.includes("summary")) return summary;
      return url.includes("scheduled-maintenances") ? maintenances : incidents;
    },
    fetchText: async () => uptimeHtml,
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
  assert.deepEqual(snapshot.components[0]?.history?.days, [
    { date: "2026-08-10", level: "operational" },
    { date: "2026-08-11", level: "degraded" },
  ]);
  assert.equal(snapshot.components[0]?.history?.uptimePercent, 99.37);
  assert.equal(snapshot.components[0]?.history?.uptimeText, "99.37%");
  assert.deepEqual(snapshot.components[1]?.history?.days, [
    { date: "2026-08-10", level: "not_monitored" },
    { date: "2026-08-11", level: "operational" },
  ]);
  assert.equal(snapshot.components[1]?.history?.uptimePercent, 100);
  assert.equal(snapshot.components[1]?.history?.uptimeText, "100.0%");
  assert.equal(snapshot.components[1]?.history?.monitoredSince, "2026-08-11");
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

test("loads Statuspage's lazy uptime showcase and preserves the published 90-day percentage", async () => {
  const summary = await fixture("summary-operational.json");
  const urls: string[] = [];
  const snapshot = await createStatuspageAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    fetchText: async () =>
      '<script>window.uptimeData = window.uptimeData || {};</script><div data-uptime-lazy="api"></div><div data-uptime-lazy="foreign"></div>',
    fetchJson: async (url) => {
      urls.push(url);
      if (url.includes("summary")) return summary;
      if (url.includes("uptime_showcase"))
        return {
          timelines: {
            api: {
              component: { code: "api", startDate: "2026-01-01" },
              days: [
                { date: "2026-08-10", outages: {} },
                { date: "2026-08-11", outages: { p: 3600 } },
              ],
            },
          },
          values: [{ component: "api", ninety: 99.4, thirty: 99.9 }],
        };
      return url.includes("scheduled-maintenances") ? { scheduled_maintenances: [] } : { incidents: [] };
    },
  }).fetch(new AbortController().signal);
  assert.equal(snapshot.components[0]?.history?.uptimeText, "99.4%");
  assert.deepEqual(snapshot.components[0]?.history?.days, [
    { date: "2026-08-10", level: "operational" },
    { date: "2026-08-11", level: "degraded" },
  ]);
  assert.equal(snapshot.components[1]?.history, undefined);
  assert.equal(urls.filter((url) => url.includes("uptime_showcase")).length, 1);
  assert.equal(new URL(urls.find((url) => url.includes("uptime_showcase"))!).searchParams.get("components"), "api");
});

test("a failed lazy uptime request preserves current status", async () => {
  const summary = await fixture("summary-operational.json");
  const snapshot = await createStatuspageAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    fetchText: async () => '<div data-uptime-lazy="api"></div>',
    fetchJson: async (url) => {
      if (url.includes("summary")) return summary;
      if (url.includes("uptime_showcase")) throw new Error("History unavailable");
      return url.includes("scheduled-maintenances") ? { scheduled_maintenances: [] } : { incidents: [] };
    },
  }).fetch(new AbortController().signal);
  assert.equal(snapshot.health, "operational");
  assert.equal(snapshot.components.length, 2);
  assert.ok(snapshot.components.every((component) => !component.history));
});

test("Statuspage preserves summary incidents when its historical endpoints fail", async () => {
  const summary = {
    ...((await fixture("summary-degraded.json")) as object),
    incidents: [
      {
        id: "active-incident",
        name: "API errors",
        status: "investigating",
        impact: "minor",
        created_at: "2026-09-10T16:00:00Z",
      },
    ],
  };
  const snapshot = await createStatuspageAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    fetchJson: async (url) => {
      if (url.includes("summary")) return summary;
      throw new Error("History unavailable");
    },
    fetchText: async () => {
      throw new Error("Chart unavailable");
    },
  }).fetch(new AbortController().signal);
  assert.equal(snapshot.health, "degraded");
  assert.equal(snapshot.incidents[0]?.id, "active-incident");
  assert.equal(snapshot.incidentHistoryAvailability, "unavailable");
  assert.equal(snapshot.components[0]?.historyAvailability, "unavailable");
});

test("malformed optional incident dates cannot invalidate a usable Statuspage refresh", async () => {
  const summary = await fixture("summary-operational.json");
  for (const list of ["incidents", "scheduled_maintenances"]) {
    const adapter = createStatuspageAdapter({
      providerId: "example",
      statusPageUrl: "https://status.example.com/",
      fetchText: async () => "",
      fetchJson: async (url) =>
        url.includes("summary")
          ? summary
          : {
              incidents: [],
              scheduled_maintenances: [],
              [list]: [{ id: "old", name: "Old incident", status: "resolved", created_at: "not-a-date" }],
            },
    });
    const record = await refreshProviderStatus(
      {
        id: "example",
        name: "Example",
        aliases: [],
        category: "model-providers",
        preferenceKey: "example",
        icon: "icon.png",
        statusPageUrl: "https://status.example.com/",
        adapter,
      },
      { cache: new SnapshotCache({ get: () => undefined, set: () => {} }) },
    );
    assert.equal(record.refreshState, "idle", record.refreshError ?? "Refresh should retain current status");
    assert.equal(record.snapshot?.health, "operational");
    assert.equal(record.snapshot?.incidentHistoryAvailability, "unavailable");
    assert.deepEqual(record.snapshot?.incidents, []);
  }
});

test("a lazy uptime timeout retains completed inline charts while cancellation still propagates", async () => {
  const summary = await fixture("summary-operational.json");
  const html = `${await textFixture("uptime.html")}<div data-uptime-lazy="code"></div>`;
  const fetchWithAbort = (reason: Error) => {
    const controller = new AbortController();
    return createStatuspageAdapter({
      providerId: "example",
      statusPageUrl: "https://status.example.com/",
      fetchText: async () => html,
      fetchJson: async (url) => {
        if (url.includes("summary")) return summary;
        if (url.includes("uptime_showcase")) {
          controller.abort(reason);
          throw reason;
        }
        return url.includes("scheduled-maintenances") ? { scheduled_maintenances: [] } : { incidents: [] };
      },
    }).fetch(controller.signal);
  };

  const snapshot = await fetchWithAbort(new RequestTimeoutError("Status request timed out"));
  assert.equal(snapshot.health, "operational");
  assert.equal(snapshot.components[0]?.history?.uptimeText, "99.37%");
  assert.equal(snapshot.components[1]?.history?.uptimeText, "100.0%");
  await assert.rejects(fetchWithAbort(new Error("Superseded request")), /Superseded request/);
});

test("preserves an unfamiliar published overall status even when its components are operational", async () => {
  const summary = (await fixture("summary-operational.json")) as Record<string, unknown>;
  summary.status = { indicator: "capacity_event", description: "Capacity event under evaluation" };
  const snapshot = await createStatuspageAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    fetchText: async () => "",
    fetchJson: async (url) =>
      url.includes("summary")
        ? summary
        : url.includes("scheduled-maintenances")
          ? { scheduled_maintenances: [] }
          : { incidents: [] },
  }).fetch(new AbortController().signal);
  assert.equal(snapshot.health, "unknown");
  assert.equal(snapshot.statusText, "Capacity event under evaluation");
});

test("ignores empty uptime initialization before a legacy inline payload", async () => {
  const html = `<script>window.uptimeData = window.uptimeData || {};</script>${await textFixture("uptime.html")}`;
  assert.ok(parseStatuspageUptimeHtml(html).api);
});

test("malformed uptime days cannot turn missing measurements into operational history or hide current status", async () => {
  const summary = await fixture("summary-operational.json");
  const html =
    '<script>window.uptimeData = {"api":{"days":[null,{"date":"2026-02-30","outages":{}},{"date":"2026-08-11"}]}};</script>';
  const snapshot = await createStatuspageAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    fetchText: async () => html,
    fetchJson: async (url) =>
      url.includes("summary")
        ? summary
        : url.includes("scheduled-maintenances")
          ? { scheduled_maintenances: [] }
          : { incidents: [] },
  }).fetch(new AbortController().signal);
  assert.equal(snapshot.health, "operational");
  assert.equal(snapshot.components[0]?.history, undefined);
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
    fetchText: async () => "",
  });

  const snapshot = await adapter.fetch(new AbortController().signal);

  assert.equal(snapshot.health, "operational");
  assert.equal(snapshot.statusText, "All Systems Operational");
  assert.equal(snapshot.incidents[0]?.state, "identified");
  assert.equal(snapshot.incidents[0]?.stateText, "identified");
  assert.equal(snapshot.incidents[0]?.impactText, "none");
});

test("treats rendered uptime as optional without swallowing cancellation", async () => {
  const summary = await fixture("summary-operational.json");
  const createAdapter = () =>
    createStatuspageAdapter({
      providerId: "example",
      statusPageUrl: "https://status.example.com/",
      fetchJson: async (url) => {
        if (url.includes("summary")) return summary;
        return url.includes("scheduled-maintenances") ? { scheduled_maintenances: [] } : { incidents: [] };
      },
      fetchText: async () => {
        throw new Error("uptime page unavailable");
      },
    });

  const snapshot = await createAdapter().fetch(new AbortController().signal);
  assert.ok(snapshot.components.every((component) => component.history === undefined));

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(createAdapter().fetch(controller.signal), /aborted/i);
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
    fetchText: async () => "",
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

test("rejects malformed embedded uptime data without inventing history", () => {
  assert.deepEqual(parseStatuspageUptimeHtml("window.uptimeData = {not-json};"), {});
});

test("maps known source states and keeps unfamiliar states unknown", () => {
  assert.equal(mapFlexibleHealth("degraded_performance"), "degraded");
  assert.equal(mapFlexibleHealth("full_outage"), "major_outage");
  assert.equal(mapFlexibleHealth("downtime"), "major_outage");
  assert.equal(mapFlexibleHealth("maintenance_scheduled"), "maintenance");
  assert.equal(mapFlexibleHealth("new-provider-state"), "unknown");
});

async function fixture(name: string): Promise<unknown> {
  const contents = await textFixture(name);
  return JSON.parse(contents) as unknown;
}

async function textFixture(name: string): Promise<string> {
  return readFile(`tests/fixtures/statuspage/${name}`, "utf8");
}
