import assert from "node:assert/strict";
import test from "node:test";
import { createFlashcatAdapter, parseFlashcatStatus } from "../src/providers/adapters/flashcat";
import { jsonFixture } from "./support/fixtures";
import { assertProviderSnapshot } from "../src/domain/snapshot-validation";
import { SnapshotCache } from "../src/services/status-cache";

test("Flashcat preserves precise uptime and its rounded display through cache validation", async () => {
  const current = await jsonFixture("flashcat/current.json");
  const structure = (await jsonFixture("flashcat/structure.json")) as {
    data: { component_uptimes: { uptime: number }[] };
  };
  structure.data.component_uptimes[1]!.uptime = 99.87654;
  const snapshot = await createFlashcatAdapter({
    providerId: "example",
    pageId: "page",
    statusPageUrl: "https://status.example.com/",
    now: () => new Date("2026-08-11T16:00:00Z"),
    fetchJson: async (url) =>
      url.includes("/summary/active")
        ? current
        : url.includes("/summary/structure")
          ? structure
          : { data: { items: [] } },
  }).fetch(new AbortController().signal);
  assert.equal(snapshot.components[1]?.history?.uptimePercent, 99.87654);
  assert.equal(snapshot.components[1]?.history?.uptimeText, "99.88%");
  let stored: string | undefined;
  const cache = new SnapshotCache({
    get: () => stored,
    set: (_key, value) => {
      stored = value;
    },
  });
  cache.setSnapshot(snapshot);
  assert.deepEqual(cache.getSnapshot("example"), JSON.parse(JSON.stringify(snapshot)));
});

test("malformed Flashcat history dates cannot invalidate current status", async () => {
  const current = await jsonFixture("flashcat/current.json");
  const history = (await jsonFixture("flashcat/history.json")) as { data: { items: { start_at_seconds: number }[] } };
  history.data.items[0]!.start_at_seconds = 1e20;
  const snapshot = await createFlashcatAdapter({
    providerId: "example",
    pageId: "page",
    statusPageUrl: "https://status.example.com/",
    fetchJson: async (url) => {
      if (url.includes("/summary/active")) return current;
      if (url.includes("/change/list")) return history;
      throw new Error("No chart");
    },
  }).fetch(new AbortController().signal);
  assertProviderSnapshot(snapshot, "example");
  assert.equal(snapshot.incidentHistoryAvailability, "unavailable");
  assert.ok(snapshot.incidents.every((incident) => incident.state !== "resolved"));
});

test("Flashcat preserves active status when incident and component history are unavailable", async () => {
  const current = await jsonFixture("flashcat/current.json");
  const snapshot = await createFlashcatAdapter({
    providerId: "example",
    pageId: "page",
    statusPageUrl: "https://status.example.com/",
    fetchJson: async (url) => {
      if (url.endsWith("/summary/active")) return current;
      throw new Error("History unavailable");
    },
  }).fetch(new AbortController().signal);
  assert.equal(snapshot.components.length, 2);
  assert.ok(snapshot.incidents.some((incident) => incident.state !== "resolved"));
  assert.equal(snapshot.incidentHistoryAvailability, "unavailable");
  assert.ok(snapshot.components.every((component) => component.historyAvailability === "unavailable"));
});

test("normalizes Flashcat components, active changes, and incident history", async () => {
  const parsed = parseFlashcatStatus(
    await jsonFixture("flashcat/current.json"),
    await jsonFixture("flashcat/history.json"),
    "https://status.deepseek.com/",
    await jsonFixture("flashcat/structure.json"),
    new Date("2026-08-11T16:00:00Z"),
  );

  assert.equal(parsed.reportedHealth, "unknown");
  assert.equal(parsed.incidents.filter((incident) => incident.state !== "resolved").length, 1);
  assert.deepEqual(
    parsed.components.map(({ id, group, health }) => ({ id, group, health })),
    [
      { id: "api", group: undefined, health: "operational" },
      { id: "chat", group: "Chat", health: "degraded" },
    ],
  );
  assert.equal(parsed.components[1]?.statusText, "degraded");
  assert.equal(parsed.components[1]?.history?.uptimePercent, 99.8);
  assert.equal(parsed.components[1]?.history?.uptimeText, "99.80%");
  assert.deepEqual(parsed.components[1]?.history?.days.slice(-3), [
    { date: "2026-08-09", level: "operational" },
    { date: "2026-08-10", level: "degraded" },
    { date: "2026-08-11", level: "operational" },
  ]);
  assert.equal(parsed.incidents.length, 2);
  assert.equal(parsed.incidents[0]?.state, "investigating");
  assert.equal(parsed.incidents[0]?.stateText, "investigating");
  assert.equal(parsed.incidents[1]?.state, "resolved");
  assert.equal(parsed.incidents[1]?.health, "degraded");
  assert.equal(parsed.incidents[1]?.url, "https://status.deepseek.com/incidents/100");
  assert.throws(
    () => parseFlashcatStatus({ data: { page: { components: [] } } }, { data: { items: [] } }, "https://example.com"),
    /contained no components/,
  );
});
