import assert from "node:assert/strict";
import test from "node:test";
import { parseOpenRouterStatusPage } from "../src/providers/adapters/openrouter";
import { createPageAndFeedAdapter, parseIncidentRss } from "../src/providers/adapters/page-and-feed";
import { textFixture } from "./support/fixtures";
import { assertProviderSnapshot } from "../src/domain/snapshot-validation";

test("invalid normalized RSS dates cannot hide the page's current status", async () => {
  const html = await textFixture("html-rss/online-or-not.html");
  const snapshot = await createPageAndFeedAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    feedUrl: "https://status.example.com/feed.rss",
    parsePage: parseOpenRouterStatusPage,
    parseFeed: () => [
      {
        id: "old",
        title: "Old incident",
        health: "degraded",
        state: "resolved",
        startedAt: "not-a-date",
        affectedComponentIds: [],
        updates: [],
      },
    ],
    fetchText: async () => html,
  }).fetch(new AbortController().signal);
  assertProviderSnapshot(snapshot, "example");
  assert.equal(snapshot.health, "operational");
  assert.equal(snapshot.incidentHistoryAvailability, "unavailable");
});

test("a failed RSS feed preserves the status published by the page", async () => {
  const html = await textFixture("html-rss/online-or-not.html");
  const snapshot = await createPageAndFeedAdapter({
    providerId: "example",
    statusPageUrl: "https://status.example.com/",
    feedUrl: "https://status.example.com/feed.rss",
    parsePage: parseOpenRouterStatusPage,
    fetchText: async (url) => {
      if (url.endsWith(".rss")) throw new Error("RSS unavailable");
      return html;
    },
  }).fetch(new AbortController().signal);
  assert.equal(snapshot.health, "operational");
  assert.equal(snapshot.incidentHistoryAvailability, "unavailable");
  assert.ok(snapshot.components.length > 0);
});

test("normalizes server-rendered component pages and groups repeated RSS updates", async () => {
  const openRouter = parseOpenRouterStatusPage(await textFixture("html-rss/online-or-not.html"));
  const incidents = parseIncidentRss(await textFixture("html-rss/incidents.rss"));
  const xaiIncidents = parseIncidentRss(await textFixture("html-rss/xai-components.rss"));

  assert.deepEqual(
    openRouter.components.map(({ id, health, statusText }) => ({ id, health, statusText })),
    [
      { id: "chat-api-v1-chat-completions", health: "operational", statusText: "Operational" },
      { id: "data-api", health: "operational", statusText: "Operational" },
      { id: "homepage", health: "operational", statusText: "Operational" },
      { id: "clerk-ui-account-auth", health: "operational", statusText: "Operational" },
    ],
  );
  assert.equal(incidents.length, 1);
  assert.equal(incidents[0]?.state, "resolved");
  assert.equal(incidents[0]?.stateText, "RESOLVED");
  assert.equal(incidents[0]?.updates.length, 2);
  assert.deepEqual(incidents[0]?.affectedComponentIds, ["api"]);
  assert.equal(xaiIncidents[0]?.state, "resolved");
  assert.equal(xaiIncidents[0]?.stateText, "RESOLVED");
  assert.equal(xaiIncidents[0]?.updates.length, 2);
  assert.equal(xaiIncidents[0]?.updates.at(-1)?.state, "unknown");
  assert.equal(xaiIncidents[0]?.updates.at(-1)?.stateText, "Service Restored");
  assert.equal(xaiIncidents[0]?.startedAt, "2026-08-11T15:00:00.000Z");
  assert.equal(xaiIncidents[0]?.resolvedAt, "2026-08-11T15:30:00.000Z");
  assert.ok(xaiIncidents.every((incident) => incident.state === "resolved"));
  assert.throws(() => parseIncidentRss("not xml"), /was not RSS/);
});
