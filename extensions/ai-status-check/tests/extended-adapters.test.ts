import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { Incident } from "../src/domain/types";
import { parseBetterStack } from "../src/providers/adapters/betterstack";
import { parseFlashcatStatus } from "../src/providers/adapters/flashcat";
import { geminiComponents, parseGeminiBootConfig, parseGeminiIncidents } from "../src/providers/adapters/gemini";
import {
  parseInstatus,
  parseInstatusComponentHistories,
  parseInstatusHistory,
} from "../src/providers/adapters/instatus";
import { parseMistralStatusPage } from "../src/providers/adapters/mistral";
import { parseOpenRouterStatusPage } from "../src/providers/adapters/openrouter";
import { parseIncidentRss } from "../src/providers/adapters/page-and-feed";
import { parseXaiComponentHistory, parseXaiStatusPage } from "../src/providers/adapters/xai";

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
    history: {
      basis: "availability",
      windowDays: 3,
      days: [
        { date: "2026-08-09", level: "not_monitored" },
        { date: "2026-08-10", level: "major_outage" },
        { date: "2026-08-11", level: "operational" },
      ],
      uptimePercent: 99.5,
      uptimeText: "99.500%",
      monitoredSince: "2026-08-10",
    },
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

test("parses Instatus component uptime from its rendered flight payload", () => {
  const flight = `"componentsUptime":${JSON.stringify({
    api: {
      uptime: "99.75",
      outages: [
        {
          from: "2026-08-10T10:00:00Z",
          to: "2026-08-10T11:00:00Z",
          status: "PARTIALOUTAGE",
        },
      ],
    },
  })}`;
  const html = `<script>self.__next_f.push([1,${JSON.stringify(flight)}])</script>`;
  const history = parseInstatusComponentHistories(html, new Date("2026-08-11T16:00:00Z")).get("api");

  assert.equal(history?.uptimePercent, 99.75);
  assert.equal(history?.uptimeText, "99.75%");
  assert.deepEqual(history?.days.slice(-2), [
    { date: "2026-08-10", level: "partial_outage" },
    { date: "2026-08-11", level: "operational" },
  ]);
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

test("normalizes server-rendered component pages and groups repeated RSS updates", async () => {
  const mistralPage = await textFixture("html-rss/mistral.html");
  const mistral = parseMistralStatusPage(
    mistralPage.replace(
      '<div aria-label="Service Batch">',
      `<div data-history="${"x".repeat(13_000)}"></div><div aria-label="Service Batch">`,
    ),
  );
  const openRouter = parseOpenRouterStatusPage(await textFixture("html-rss/online-or-not.html"));
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

test("preserves rendered Mistral monitoring gaps and exact uptime", () => {
  const nuxtValues: unknown[] = [
    ["ShallowReactive", 1],
    { data: 2 },
    ["ShallowReactive", 3],
    { "uptime-example": 4 },
    { uptime: 5 },
    [6],
    { services: 7 },
    [8],
    { name: 9, days: 10, uptime: 11 },
    "API",
    [12, 15],
    99.5,
    { date: 13, events: 14 },
    "2026-08-10T00:00:00.000Z",
    [],
    { date: 16, events: 17 },
    "2026-08-11T00:00:00.000Z",
    [18],
    { severity: 19 },
    "MAJOR",
  ];
  const html = `<h2>All systems operational</h2><div aria-label="Card Platform"><div aria-label="Service API"><div class="status-circle bg-green-500"></div></div></div><script type="application/json" id="__NUXT_DATA__">${JSON.stringify(nuxtValues)}</script>`;
  const component = parseMistralStatusPage(html, new Date("2026-08-11T16:00:00Z")).components[0];

  assert.equal(component?.history?.uptimePercent, 99.5);
  assert.equal(component?.history?.uptimeText, "99.5%");
  assert.equal(component?.history?.monitoredSince, "2026-08-10");
  assert.deepEqual(component?.history?.days.slice(-3), [
    { date: "2026-08-09", level: "not_monitored" },
    { date: "2026-08-10", level: "operational" },
    { date: "2026-08-11", level: "major_outage" },
  ]);
});

test("keeps unfamiliar Mistral history severity unknown", () => {
  const nuxtValues: unknown[] = [
    ["ShallowReactive", 1],
    { data: 2 },
    ["ShallowReactive", 3],
    { "uptime-example": 4 },
    { uptime: 5 },
    [6],
    { services: 7 },
    [8],
    { name: 9, days: 10, uptime: 11 },
    "API",
    [12],
    100,
    { date: 13, events: 14 },
    "2026-08-11T00:00:00.000Z",
    [15],
    { severity: 16 },
    "NEW_SEVERITY",
  ];
  const html = `<h2>All systems operational</h2><div aria-label="Card Platform"><div aria-label="Service API"><div class="status-circle bg-green-500"></div></div></div><script type="application/json" id="__NUXT_DATA__">${JSON.stringify(nuxtValues)}</script>`;
  const component = parseMistralStatusPage(html, new Date("2026-08-11T16:00:00Z")).components[0];

  assert.equal(component?.history?.days.at(-1)?.level, "unknown");
});

test("adds OpenRouter history only to rows that publish a chart", () => {
  const chart = ["green", "zinc", "red"]
    .map((color) => `<div class="h-8 sm:h-9 w-1 bg-${color}-500"></div>`)
    .join("");
  const html = `<p class="text-gray-900">Chat API</p><span>Operational</span>${chart}<span class="underline">99.9<!-- -->% uptime</span><p class="text-gray-900">Clerk</p><span>Operational</span>`;
  const components = parseOpenRouterStatusPage(html, new Date("2026-08-11T16:00:00Z")).components;

  assert.deepEqual(components[0]?.history?.days, [
    { date: "2026-08-09", level: "operational" },
    { date: "2026-08-10", level: "unknown" },
    { date: "2026-08-11", level: "major_outage" },
  ]);
  assert.equal(components[0]?.history?.uptimePercent, 99.9);
  assert.equal(components[0]?.history?.uptimeText, "99.9%");
  assert.equal(components[1]?.history, undefined);
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
      url: "https://status.x.ai/api-us-east-1",
    },
    {
      id: "docs",
      name: "Docs",
      health: "operational",
      statusText: "available",
      url: "https://status.x.ai/docs",
    },
  ]);
  assert.throws(() => parseXaiStatusPage("not rsc"), /was malformed/);
});

test("reproduces xAI's official 30-day incident chart without inventing uptime", () => {
  const payload = {
    name: "Grok (iOS)",
    slug: "ios-app",
    incidents: [
      {
        status: "resolved",
        startTime: "2026-08-10T10:00:00Z",
        endTime: "2026-08-11T11:00:00Z",
        severity: "available",
        updates: [
          { createTime: "2026-08-10T10:00:00Z", severity: "info" },
          { createTime: "2026-08-11T09:00:00Z", severity: "disruption" },
          { createTime: "2026-08-11T11:00:00Z", severity: "available" },
        ],
      },
    ],
  };
  const history = parseXaiComponentHistory(`prefix "product":${JSON.stringify(payload)} suffix`, new Date("2026-08-11T16:00:00Z"));

  assert.equal(history.uptimePercent, undefined);
  assert.deepEqual(history.days.slice(-2), [
    { date: "2026-08-10", level: "informational" },
    { date: "2026-08-11", level: "degraded" },
  ]);
});

test("keeps unfamiliar xAI history severity unknown", () => {
  const payload = {
    incidents: [
      {
        status: "active",
        startTime: "2026-08-11T10:00:00Z",
        severity: "new-severity",
        updates: [{ createTime: "2026-08-11T10:00:00Z", severity: "new-severity" }],
      },
    ],
  };
  const history = parseXaiComponentHistory(
    `prefix "product":${JSON.stringify(payload)} suffix`,
    new Date("2026-08-11T16:00:00Z"),
  );

  assert.equal(history.days.at(-1)?.level, "unknown");
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
  const components = geminiComponents(incidents, new Date("2026-08-11T16:00:00Z"));
  assert.equal(components[0]?.history?.uptimePercent, undefined);
  assert.equal(components[0]?.history?.days.at(-1)?.level, "major_outage");
  assert.equal(components[2]?.history?.days.at(-2)?.level, "degraded");
  assert.throws(() => parseGeminiBootConfig("<html></html>"), /boot configuration was missing/);
  assert.throws(() => parseGeminiIncidents({}, "https://example.com"), /response was malformed/);
});

test("extends an active Gemini incident through the current day", () => {
  const incident: Incident = {
    id: "active-api-incident",
    title: "API disruption",
    health: "degraded",
    state: "monitoring",
    startedAt: "2026-08-09T10:00:00Z",
    updatedAt: "2026-08-09T12:00:00Z",
    affectedComponentIds: ["1"],
    updates: [],
  };

  const component = geminiComponents([incident], new Date("2026-08-11T16:00:00Z"))[0];
  assert.deepEqual(component?.history?.days.slice(-3), [
    { date: "2026-08-09", level: "degraded" },
    { date: "2026-08-10", level: "degraded" },
    { date: "2026-08-11", level: "degraded" },
  ]);
});

async function jsonFixture(path: string): Promise<unknown> {
  return JSON.parse(await textFixture(path)) as unknown;
}

async function textFixture(path: string): Promise<string> {
  return readFile(`tests/fixtures/${path}`, "utf8");
}
