import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createMistralAdapter,
  fetchMistralHtml,
  parseMistralComponents,
  parseMistralHistory,
  parseMistralIncident,
} from "../src/providers/adapters/mistral";
import { RequestTimeoutError } from "../src/utils/request-timeout";
import { buildComponentHistoryMarkdown } from "../src/utils/component-history-markdown";

const SOURCE = "https://status.mistral.ai/";
const COMPONENT = "304d5895-4dde-47be-b2e1-b7ebeb28dd4d";
const NOW = new Date("2026-09-10T20:00:00Z");
const baseline = {
  page: { name: "Mistral AI Status", url: SOURCE },
  status: { indicator: "none", description: "All Systems Operational" },
  incidents: [],
};

test("Mistral reads Rootly status, components and exact uptime with all published calendar dates", async () => {
  const urls: string[] = [];
  const config = {
    providerId: "mistral-ai",
    statusPageUrl: SOURCE,
    now: () => NOW,
    fetchJson: async (url: string) => {
      urls.push(url);
      return baseline;
    },
    fetchText: async (url: string) => {
      urls.push(url);
      return url === SOURCE ? rootlyHtml() : "<main><h2>Incident history</h2></main>";
    },
  };
  const snapshot = await createMistralAdapter(config).fetch(new AbortController().signal);
  assert.equal(snapshot.health, "operational");
  assert.equal(snapshot.statusText, "All Systems Operational");
  assert.equal(snapshot.components[0]?.id, COMPONENT);
  assert.equal(snapshot.components[0]?.name, "Agents API");
  assert.equal(snapshot.components[0]?.health, "operational");
  assert.equal(snapshot.components[0]?.group, "Services");
  const history = snapshot.components[0]?.history;
  assert.equal(history?.uptimeText, "99.93%");
  assert.equal(history?.days.length, 91);
  assert.deepEqual(history?.days[0], { date: "2026-06-12", level: "operational" });
  assert.deepEqual(history?.days.at(-1), { date: "2026-09-10", level: "affected" });
  assert.equal(history?.monitoredSince, undefined);
  assert.match(buildComponentHistoryMarkdown(history) ?? "", /Past 90 days/);
  assert.doesNotMatch(buildComponentHistoryMarkdown(history) ?? "", /91 days/);
  assert.ok(urls.includes(`${SOURCE}api/v1/status.json`));
  assert.ok(urls.every((url) => !url.includes("feed.rss") && !url.includes("uptime-chart-tooltip")));
});

test("Mistral retains core status and active incident updates when HTML is blocked", async () => {
  const config = {
    providerId: "mistral-ai",
    statusPageUrl: SOURCE,
    fetchJson: async () => ({
      ...baseline,
      status: { indicator: "critical", description: "Major System Outage" },
      incidents: [
        {
          id: "active",
          name: "API issues",
          status: "investigating",
          impact: "critical",
          created_at: "2026-09-10T10:00:00Z",
          incident_updates: [
            {
              id: "update",
              status: "investigating",
              body: "Investigating failures.",
              created_at: "2026-09-10T10:00:00Z",
            },
          ],
        },
      ],
    }),
    fetchText: async () => {
      throw new Error("Status source returned HTTP 403");
    },
  };
  const snapshot = await createMistralAdapter(config).fetch(new AbortController().signal);
  assert.equal(snapshot.health, "major_outage");
  assert.deepEqual(snapshot.components, []);
  assert.equal(snapshot.incidents[0]?.updates[0]?.body, "Investigating failures.");
});

test("Mistral rejects a wrong-provider or malformed baseline instead of treating it as operational", async () => {
  for (const payload of [{}, { ...baseline, page: { url: "https://wrong.example/" } }]) {
    const config = {
      providerId: "mistral-ai",
      statusPageUrl: SOURCE,
      fetchJson: async () => payload,
      fetchText: async () => rootlyHtml(),
    };
    await assert.rejects(createMistralAdapter(config).fetch(new AbortController().signal));
  }
});

test("Mistral preserves an unfamiliar source indicator and does not derive health from green components", async () => {
  const config = {
    providerId: "mistral-ai",
    statusPageUrl: SOURCE,
    fetchJson: async () => ({ ...baseline, status: { indicator: "new_state", description: "New source state" } }),
    fetchText: async (url: string) => (url === SOURCE ? rootlyHtml() : "<main></main>"),
  };
  const snapshot = await createMistralAdapter(config).fetch(new AbortController().signal);
  assert.equal(snapshot.health, "unknown");
  assert.equal(snapshot.statusText, "New source state");
});

test("Mistral does not invent healthy history when a chart is malformed", async () => {
  const config = {
    providerId: "mistral-ai",
    statusPageUrl: SOURCE,
    fetchJson: async () => baseline,
    fetchText: async (url: string) =>
      url === SOURCE ? rootlyHtml().replace('idx-param="1"', 'idx-param="99"') : "<main></main>",
  };
  const snapshot = await createMistralAdapter(config).fetch(new AbortController().signal);
  assert.equal(snapshot.components[0]?.health, "operational");
  assert.equal(snapshot.components[0]?.history, undefined);
});

test("Mistral preserves unknown chart colors and never manufactures a percentage", () => {
  const html = rootlyHtml().replaceAll("#C73C40", "#123456").replace("99.93%", "No data");
  const history = parseMistralComponents(html, SOURCE)[0]?.history;
  assert.equal(history?.days.at(-1)?.level, "unknown");
  assert.equal(history?.uptimeText, undefined);
  assert.equal(history?.uptimePercent, undefined);
});

test("Mistral history uses the source quarter and explicit update dates, retaining repeated resolutions", async () => {
  const cards = parseMistralHistory(await fixture("history.html"));
  assert.equal(cards.length, 2);
  assert.equal(cards[0]?.startedAt, "2026-09-10T16:50:00.000Z");
  assert.equal(cards[0]?.updatedAt, undefined);
  assert.equal(cards[0]?.health, "unknown");
  assert.deepEqual(cards[0]?.affectedComponentIds, []);
  const incident = parseMistralIncident(await fixture("incident-1.html"), cards[0]!);
  assert.equal(incident.resolvedAt, "2026-09-10T20:32:00.000Z");
  assert.deepEqual(
    incident.updates.map((update) => [update.state, update.createdAt]),
    [
      ["resolved", "2026-09-10T20:32:00.000Z"],
      ["resolved", "2026-09-10T17:14:00.000Z"],
      ["identified", "2026-09-10T17:04:00.000Z"],
      ["investigating", "2026-09-10T16:50:00.000Z"],
    ],
  );
  assert.equal(new Set(incident.updates.map((update) => update.id)).size, 4);
  const ocr = parseMistralIncident(await fixture("incident-2.html"), cards[1]!);
  assert.equal(ocr.startedAt, "2026-09-04T22:00:00.000Z");
  assert.equal(ocr.resolvedAt, "2026-09-05T05:48:00.000Z");
  assert.equal(ocr.updates.length, 2);
});

test("Mistral keeps current API incidents authoritative when optional HTML disagrees", async () => {
  const history = await fixture("history.html");
  const card = parseMistralHistory(history)[0]!;
  const detail = await fixture("incident-1.html");
  const snapshot = await createMistralAdapter({
    providerId: "mistral-ai",
    statusPageUrl: SOURCE,
    now: () => NOW,
    fetchJson: async () => ({
      ...baseline,
      incidents: [{ id: card.id, name: card.title, status: "monitoring", impact: "minor" }],
    }),
    fetchText: async (url) => (url === SOURCE ? rootlyHtml() : url.includes("/history?") ? history : detail),
  }).fetch(new AbortController().signal);
  assert.equal(snapshot.incidents.find((incident) => incident.id === card.id)?.state, "monitoring");
  assert.equal(snapshot.incidents.find((incident) => incident.id === card.id)?.updates.length, 4);
  assert.equal(snapshot.incidents.find((incident) => incident.id === card.id)?.startedAt, card.startedAt);
  assert.equal(snapshot.incidents.find((incident) => incident.id === card.id)?.resolvedAt, undefined);
});

test("Mistral rejects impossible chart dates without hiding the component", () => {
  const component = parseMistralComponents(rootlyHtml().replace("2026-06-12", "2026-02-30"), SOURCE)[0]!;
  assert.equal(component.health, "operational");
  assert.equal(component.history, undefined);
});

test("Mistral retains status, components and history cards if the deadline expires during incident details", async () => {
  const history = await fixture("history.html");
  const controller = new AbortController();
  const snapshot = await createMistralAdapter({
    providerId: "mistral-ai",
    statusPageUrl: SOURCE,
    now: () => NOW,
    fetchJson: async () => baseline,
    fetchText: async (url) => {
      if (url === SOURCE) return rootlyHtml();
      if (url.includes("/history?")) return history;
      controller.abort(new RequestTimeoutError("Status request timed out"));
      throw controller.signal.reason;
    },
  }).fetch(controller.signal);
  assert.equal(snapshot.health, "operational");
  assert.equal(snapshot.components.length, 1);
  assert.equal(snapshot.incidents.length, 2);
  assert.equal(snapshot.incidentHistoryAvailability, "unavailable");
  assert.ok(snapshot.incidents.every((incident) => incident.url?.startsWith(SOURCE)));
});

test("Mistral marks failed timeline enrichment incomplete while retaining history cards", async () => {
  const history = await fixture("history.html");
  const snapshot = await createMistralAdapter({
    providerId: "mistral-ai",
    statusPageUrl: SOURCE,
    now: () => NOW,
    fetchJson: async () => baseline,
    fetchText: async (url) => {
      if (url === SOURCE) return rootlyHtml();
      if (url.includes("/history?")) return history;
      throw new Error("HTTP 403");
    },
  }).fetch(new AbortController().signal);
  assert.equal(snapshot.health, "operational");
  assert.equal(snapshot.incidents.length, 2);
  assert.equal(snapshot.incidentHistoryAvailability, "unavailable");
});

test("Mistral propagates superseded refresh cancellation", async () => {
  const controller = new AbortController();
  const request = createMistralAdapter({
    providerId: "mistral-ai",
    statusPageUrl: SOURCE,
    fetchJson: async () => baseline,
    fetchText: async () => {
      controller.abort(new Error("Superseded refresh"));
      throw controller.signal.reason;
    },
  }).fetch(controller.signal);
  await assert.rejects(request, /Superseded refresh/);
});

test("Mistral native transport rejects foreign URLs and non-status routes before launching a process", async () => {
  for (const url of [
    "https://wrong.example/",
    "https://status.mistral.ai/admin",
    "https://user:pass@status.mistral.ai/",
  ]) {
    await assert.rejects(fetchMistralHtml(url, new AbortController().signal), /Unexpected Mistral/);
  }
});

function fixture(name: string): Promise<string> {
  return readFile(`tests/fixtures/mistral/${name}`, "utf8");
}

// Reduced form of the observed Rootly HTML: exact footer plus paired SVG bars/hit areas.
function rootlyHtml(): string {
  const controller = "status-pages--v2--uptime-chart-component";
  const bars = Array.from(
    { length: 91 },
    (_, index) =>
      `<rect x="${index}" style="fill: ${index === 90 ? "#C73C40" : "#3CB878"};"/><rect x="${index}" data-${controller}-idx-param="${index}" style="fill: transparent;"/>`,
  ).join("");
  return `<main><h1>Mistral AI Status</h1><details><summary><h2>Services</h2></summary><details><summary><div><h2>Agents API</h2></div><span>Operational</span></summary><turbo-frame id="uptime-chart-${COMPONENT}"><div data-controller="${controller}" data-${controller}-since-value="2026-06-12 00:00:00 UTC" data-${controller}-uptime-chart-tooltip-url-value="${SOURCE}uptime-chart-tooltip?resource_id=${COMPONENT}&amp;resource_type=service"><svg>${bars}</svg><div><span>90 days ago</span><span>99.93%</span><span>Today</span></div></div></turbo-frame></details></details></main>`;
}
