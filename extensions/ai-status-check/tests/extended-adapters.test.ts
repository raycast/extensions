import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseBetterStack } from "../src/providers/parsers/betterstack";
import { parseFlashcatStatus } from "../src/providers/parsers/flashcat";
import { parseGeminiBootConfig, parseGeminiIncidents } from "../src/providers/parsers/gemini";
import { parseInstatus, parseInstatusHistory } from "../src/providers/parsers/instatus";
import { parseIncidentRss } from "../src/providers/parsers/incident-rss";
import { parseMistralStatusPage, parseOnlineOrNotStatusPage } from "../src/providers/parsers/rendered-status";
import { parseXaiStatusPage } from "../src/providers/parsers/xai";

test("normalizes Better Stack sections, resources, incidents, and updates", async () => {
  const parsed = parseBetterStack(await jsonFixture("betterstack/index-degraded.json"));

  assert.equal(parsed.reportedHealth, "degraded");
  assert.equal(parsed.statusText, "degraded");
  assert.deepEqual(parsed.components[0], {
    id: "api",
    name: "Inference API",
    health: "degraded",
    statusText: "degraded",
    group: "Inference",
  });
  assert.equal(parsed.incidents[0]?.state, "investigating");
  assert.equal(parsed.incidents[0]?.stateText, "degraded");
  assert.equal(parsed.incidents[0]?.updates[0]?.body, "We are investigating elevated latency.");
  assert.equal(parsed.incidents[0]?.updates[0]?.stateText, "investigating");
  assert.throws(() => parseBetterStack({}), /Better Stack status page data/);
});

test("normalizes Instatus page and component health", async () => {
  const parsed = parseInstatus(
    await jsonFixture("instatus/summary.json"),
    await jsonFixture("instatus/components.json"),
  );

  assert.equal(parsed.reportedHealth, "operational");
  assert.deepEqual(
    parsed.components.map(({ id, group, health }) => ({ id, group, health })),
    [
      { id: "api", group: "Services", health: "operational" },
      { id: "web", group: undefined, health: "degraded" },
      { id: "computer", group: undefined, health: "operational" },
    ],
  );
  const incidents = parseInstatusHistory(await textFixture("instatus/history.rss"), parsed.components);
  assert.equal(incidents[0]?.title, "Computer Sandbox Issue");
  assert.equal(incidents[0]?.state, "resolved");
  assert.equal(incidents[0]?.updates.length, 2);
  assert.deepEqual(incidents[0]?.affectedComponentIds, ["computer"]);
  assert.throws(() => parseInstatus({ page: {} }, { components: [] }), /did not contain a status/);
});

test("normalizes Flashcat components, active changes, and incident history", async () => {
  const parsed = parseFlashcatStatus(
    await jsonFixture("flashcat/current.json"),
    await jsonFixture("flashcat/history.json"),
    "https://status.deepseek.com/",
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

test("normalizes server-rendered component pages and groups repeated RSS updates", async () => {
  const mistralPage = await textFixture("html-rss/mistral.html");
  const mistral = parseMistralStatusPage(
    mistralPage.replace(
      '<div aria-label="Service Batch">',
      `<div data-history="${"x".repeat(13_000)}"></div><div aria-label="Service Batch">`,
    ),
  );
  const openRouter = parseOnlineOrNotStatusPage(await textFixture("html-rss/online-or-not.html"));
  const incidents = parseIncidentRss(await textFixture("html-rss/incidents.rss"));
  const xaiIncidents = parseIncidentRss(await textFixture("html-rss/xai-components.rss"));

  assert.equal(mistral.reportedHealth, "operational");
  assert.equal(mistral.statusText, "All systems operational");
  assert.deepEqual(
    mistral.components.map(({ name, group, health }) => ({ name, group, health })),
    [
      { name: "API", group: "La Plateforme", health: "operational" },
      { name: "Batch", group: "La Plateforme", health: "degraded" },
    ],
  );
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
  assert.throws(() => parseMistralStatusPage("<html></html>"), /contained no services/);
  assert.throws(() => parseIncidentRss("not xml"), /was not RSS/);
});

test("discovers every live xAI service from the rendered status payload", async () => {
  const parsed = parseXaiStatusPage(await textFixture("html-rss/xai-status.rsc"));

  assert.equal(parsed.reportedHealth, "operational");
  assert.equal(parsed.statusText, "No incidents declared");
  assert.deepEqual(parsed.components, [
    {
      id: "api-us-east-1",
      name: "API (us-east-1.api.x.ai)",
      health: "operational",
      statusText: "available",
    },
    {
      id: "docs",
      name: "Docs",
      health: "operational",
      statusText: "available",
    },
  ]);
  assert.throws(() => parseXaiStatusPage("not rsc"), /was malformed/);
});

test("maps only verified Gemini status RPC enums and preserves their rendered labels", async () => {
  const page = await textFixture("gemini/page.html");
  const incidents = parseGeminiIncidents(
    await jsonFixture("gemini/incidents.json"),
    "https://aistudio.google.com/status",
  );

  assert.deepEqual(parseGeminiBootConfig(page), {
    apiKey: "public-status-key",
    rpcBase: "https://status-rpc.example.com",
  });

  const major = incidents.find((incident) => incident.id === "major-update");
  assert.equal(major?.state, "monitoring");
  assert.equal(major?.stateText, "Update");
  assert.equal(major?.health, "major_outage");
  assert.deepEqual(major?.affectedComponentIds, ["1"]);
  assert.deepEqual(
    major?.updates.map(({ state, stateText }) => ({ state, stateText })),
    [
      { state: "investigating", stateText: "Detected" },
      { state: "monitoring", stateText: "Update" },
    ],
  );

  const moderate = incidents.find((incident) => incident.id === "moderate-lifecycle");
  assert.equal(moderate?.state, "resolved");
  assert.equal(moderate?.stateText, "Resolved");
  assert.equal(moderate?.health, "degraded");
  assert.deepEqual(
    moderate?.updates.map(({ state, stateText }) => ({ state, stateText })),
    [
      { state: "investigating", stateText: "Detected" },
      { state: "identified", stateText: "Identified" },
      { state: "monitoring", stateText: "Mitigated" },
      { state: "resolved", stateText: "Resolved" },
    ],
  );

  const future = incidents.find((incident) => incident.id === "future-enums");
  assert.equal(future?.state, "unknown");
  assert.equal(future?.stateText, undefined);
  assert.equal(future?.health, "unknown");
  assert.equal(future?.updates[0]?.stateText, undefined);
  assert.throws(() => parseGeminiBootConfig("<html></html>"), /boot configuration was missing/);
  assert.throws(() => parseGeminiIncidents({}, "https://example.com"), /response was malformed/);
});

async function jsonFixture(path: string): Promise<unknown> {
  return JSON.parse(await textFixture(path)) as unknown;
}

async function textFixture(path: string): Promise<string> {
  return readFile(`tests/fixtures/${path}`, "utf8");
}
