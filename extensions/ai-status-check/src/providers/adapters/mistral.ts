import { parseDateKey } from "../../utils/dates";
import { assertIncidents } from "../../domain/snapshot-validation";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { parse, type HTMLElement } from "node-html-parser";
import type {
  ComponentHistory,
  ComponentHistoryDay,
  ComponentStatus,
  DataAvailability,
  Incident,
  IncidentUpdate,
} from "../../domain/types";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";
import { componentHistory, dateKey } from "../utils/component-history";
import { fetchJson, fetchText, type FetchJson, type FetchText } from "../utils/http";
import { mergeIncidents } from "../../domain/incidents";
import { fetchOptionalEnrichment } from "../utils/optional-enrichment";
import { optionalString, requireRecord } from "../utils/runtime-values";
import { stripHtml } from "../utils/rss";
import { mapFlexibleHealth, mapFlexibleIncidentState } from "../utils/status-normalization";
import { parseIncidents, parseSummary } from "./statuspage";

export interface MistralAdapterConfig extends ProviderAdapterConfig {
  fetchJson?: FetchJson;
  fetchText?: FetchText;
}

export function createMistralAdapter(config: MistralAdapterConfig): ProviderAdapter {
  const json = config.fetchJson ?? fetchJson;
  const html = config.fetchText ?? fetchMistralHtml;
  const now = config.now ?? (() => new Date());

  return {
    async fetch(signal) {
      const payload = await json(new URL("api/v1/status.json", config.statusPageUrl).toString(), signal);
      const page = requireRecord(requireRecord(payload, "Mistral status").page, "Mistral status page");
      const pageUrl = optionalString(page.url);
      if (!pageUrl || new URL(pageUrl).origin !== new URL(config.statusPageUrl).origin) {
        throw new Error("Mistral status response identified a different page");
      }
      const summary = parseSummary(payload);
      const activeIncidents = parseIncidents(payload, config.statusPageUrl);
      const fetchedAt = now();
      const [components, history] = await Promise.all([
        fetchOptionalEnrichment(
          signal,
          async (detailSignal) =>
            parseMistralComponents(await html(config.statusPageUrl, detailSignal), config.statusPageUrl),
          7_000,
        ),
        fetchRecentHistory(signal, fetchedAt),
      ]);

      return {
        providerId: config.providerId,
        health: summary.reportedHealth,
        statusText: summary.statusText,
        components: components ?? [],
        incidents: mergeIncidents(history.incidents, activeIncidents, { authoritativeCurrentState: true }),
        incidentHistoryAvailability: history.availability,
        fetchedAt: fetchedAt.toISOString(),
      };
    },
  };

  async function fetchRecentHistory(
    signal: AbortSignal,
    date: Date,
  ): Promise<{ incidents: Incident[]; availability: DataAvailability }> {
    let history: Incident[] = [];
    let availability: DataAvailability = "unavailable";
    await fetchOptionalEnrichment(signal, async (detailSignal) => {
      const historyUrl = (selected: Date) =>
        new URL(`history?date=${dateKey(selected)}`, config.statusPageUrl).toString();
      const current = parseMistralHistory(await html(historyUrl(date), detailSignal)).slice(0, 10);
      assertIncidents(current);
      history = current;
      availability = "available";
      if (history.length < 10) {
        availability = "unavailable";
        const previousQuarter = new Date(Date.UTC(date.getUTCFullYear(), Math.floor(date.getUTCMonth() / 3) * 3, 0));
        const previous = await fetchOptionalEnrichment(detailSignal, async (previousSignal) => {
          const incidents = parseMistralHistory(await html(historyUrl(previousQuarter), previousSignal));
          assertIncidents(incidents);
          return incidents;
        });
        history = mergeIncidents(previous ?? [], history).slice(0, 10);
        if (previous !== undefined) availability = "available";
      }
      const listingsAvailable = availability === "available";
      availability = "unavailable";
      if (await enrichIncidentDetails(history, detailSignal)) {
        if (listingsAvailable) availability = "available";
      }
    });
    // The operation owns progressive results: a later timeout keeps completed cards.
    return { incidents: mergeIncidents(history), availability };
  }

  async function enrichIncidentDetails(recent: Incident[], signal: AbortSignal): Promise<boolean> {
    // Bound native processes and requests. A missing detail keeps the source card and link.
    let next = 0;
    let complete = true;
    await Promise.all(
      Array.from({ length: Math.min(3, recent.length) }, async () => {
        while (next < recent.length && !signal.aborted) {
          const index = next++;
          const incident = recent[index]!;
          const detail = await fetchOptionalEnrichment(signal, async (detailSignal) => {
            const parsed = parseMistralIncident(await html(incident.url!, detailSignal), incident);
            if (parsed) assertIncidents([parsed]);
            return parsed;
          });
          if (detail && !signal.aborted) recent[index] = detail;
          else complete = false;
        }
      }),
    );
    return complete && !signal.aborted;
  }
}

const CHART = "status-pages--v2--uptime-chart-component";
const CARD = "status-pages--clickable-card";
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export function parseMistralComponents(html: string, statusPageUrl: string): ComponentStatus[] {
  const root = parse(html);
  const components = new Map<string, ComponentStatus>();
  for (const chart of root.querySelectorAll(`[data-controller~="${CHART}"]`)) {
    const details = chart.closest("details");
    const summary = details && directChild(details, "SUMMARY");
    const name = text(summary?.querySelector("h2"));
    const statusText = text(summary && directChild(summary, "SPAN"));
    const id = chart.closest("turbo-frame")?.id.replace(/^uptime-chart-/, "");
    if (!id || !UUID.test(id) || !name || !statusText) continue;
    const groupDetails = details?.parentNode?.closest("details");
    const group = text(groupDetails && directChild(groupDetails, "SUMMARY")?.querySelector("h2"));
    const history = parseChart(chart, id);
    components.set(id, {
      id,
      name,
      group: group || undefined,
      health: mapFlexibleHealth(statusText),
      statusText,
      url: statusPageUrl,
      history,
      historyAvailability: history ? "available" : "unavailable",
    });
  }
  if (components.size === 0) throw new Error("Mistral status page contained no services");
  return [...components.values()];
}

function parseChart(chart: HTMLElement, componentId: string): ComponentHistory | undefined {
  const since = chart.getAttribute(`data-${CHART}-since-value`);
  const start = since && /^(\d{4}-\d{2}-\d{2}) 00:00:00 UTC$/.exec(since)?.[1];
  if (!parseDateKey(start)) return;
  const tooltip = chart.getAttribute(`data-${CHART}-uptime-chart-tooltip-url-value`);
  try {
    const url = new URL(tooltip ?? "");
    if (url.origin !== "https://status.mistral.ai" || url.searchParams.get("resource_id") !== componentId) return;
  } catch {
    return;
  }
  const footer = chart.children.find((child) => text(child.children[0]).endsWith("days ago"));
  const periodDays = Number(/^(\d+) days ago$/.exec(text(footer?.children[0]))?.[1]);
  if (!Number.isInteger(periodDays) || periodDays < 1 || periodDays > 366 || text(footer?.children[2]) !== "Today")
    return;
  const uptimeText = text(footer?.children[1]);
  const percent = /^(\d+(?:\.\d+)?)%$/.exec(uptimeText);
  const bars = chart.querySelectorAll("svg rect");
  const days: ComponentHistoryDay[] = [];
  for (const [position, bar] of bars.entries()) {
    const indexText = bar.getAttribute(`data-${CHART}-idx-param`);
    if (indexText === undefined) continue;
    if (!/^\d+$/.test(indexText) || Number(indexText) !== days.length) return;
    const colorBar = bars[position - 1];
    if (
      !colorBar ||
      colorBar.hasAttribute(`data-${CHART}-idx-param`) ||
      colorBar.getAttribute("x") !== bar.getAttribute("x")
    )
      return;
    const color = /(?:^|;)\s*fill:\s*(#[a-f0-9]{6})\s*(?:;|$)/i
      .exec(colorBar.getAttribute("style") ?? "")?.[1]
      ?.toUpperCase();
    const date = new Date(`${start}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days.length);
    days.push({
      date: date.toISOString().slice(0, 10),
      level: color === "#3CB878" ? "operational" : color === "#C73C40" ? "affected" : "unknown",
    });
  }
  // Rootly includes both endpoints: "90 days ago" through "Today" is 91 dates.
  if (days.length !== periodDays + 1) return;
  const history = componentHistory("availability", days, {
    uptimePercent: percent ? Number(percent[1]) : undefined,
    uptimeText: percent ? uptimeText : undefined,
  });
  return history && { ...history, periodDays };
}

export function parseMistralHistory(html: string): Incident[] {
  const frame = parse(html).querySelector("turbo-frame#quarterly_incident_history");
  if (!frame) throw new Error("Mistral incident history frame was missing");
  const quarter = /[A-Z][a-z]{2} (\d{4})\s*-\s*[A-Z][a-z]{2} (\d{4})/.exec(text(directChild(frame, "SECTION")));
  if (!quarter || quarter[1] !== quarter[2]) throw new Error("Mistral incident history quarter was missing");
  const incidents: Incident[] = [];
  for (const card of frame.querySelectorAll(`[data-controller~="${CARD}"]`)) {
    const sourceUrl = card.getAttribute(`data-${CARD}-url-value`);
    if (!sourceUrl) continue;
    let url: URL;
    try {
      url = mistralPageUrl(sourceUrl);
    } catch {
      continue;
    }
    const id = url.pathname.split("/").at(-1);
    if (!id || !UUID.test(id)) continue;
    const heading = directChild(card, "DIV");
    const title = text(heading && directChild(heading, "SPAN"));
    const startedAt = parseUtcDate(text(heading && directChild(heading, "DIV")), Number(quarter[1]));
    const stateText = text(card.children[1]?.querySelector("span span"));
    if (!title || !startedAt || !stateText) continue;
    incidents.push({
      id,
      title,
      startedAt,
      state: mapFlexibleIncidentState(stateText),
      stateText,
      health: "unknown",
      affectedComponentIds: [],
      updates: [],
      url: url.toString(),
    });
  }
  return mergeIncidents(incidents);
}

export function parseMistralIncident(html: string, incident: Incident): Incident {
  const main = parse(html).querySelector("main");
  const heading = main && directChild(main, "SECTION");
  const title = text(heading?.querySelector("h2"));
  const startedAt = parseUtcDate(text(heading?.querySelector("span")));
  if (title !== incident.title || !startedAt) throw new Error("Mistral incident detail did not match its source card");
  const updates: IncidentUpdate[] = [];
  for (const content of main!.querySelectorAll(".status-page-markdown-content")) {
    const row = content.parentNode;
    if (!row) continue;
    const stateText = text(directChild(row, "SPAN"));
    const createdAt = parseUtcDate(text(row.children.at(-1)));
    const body = stripHtml(content.innerHTML);
    if (!body || !stateText || !createdAt) continue;
    const hash = createHash("sha256").update(`${createdAt}\n${stateText}\n${body}`).digest("hex").slice(0, 16);
    updates.push({
      id: `${incident.id}:${hash}`,
      state: mapFlexibleIncidentState(stateText),
      stateText,
      body,
      createdAt,
    });
  }
  updates.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const latest = updates[0];
  if (!latest) throw new Error("Mistral incident detail contained no dated updates");
  return {
    ...incident,
    startedAt,
    state: latest.state,
    stateText: latest.stateText,
    updatedAt: latest.createdAt,
    resolvedAt: latest.state === "resolved" ? latest.createdAt : undefined,
    updates,
  };
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseUtcDate(value: string, defaultYear?: number): string | undefined {
  const match = /^(\w+) (\d{1,2})(?:, (\d{4}))? at (\d{2}):(\d{2}) (AM|PM) UTC$/.exec(value);
  if (!match) return;
  const month = MONTHS.indexOf(match[1]!);
  const year = match[3] ? Number(match[3]) : defaultYear;
  const day = Number(match[2]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (!year || month < 0 || day < 1 || hour < 1 || hour > 12 || minute > 59) return;
  const date = new Date(Date.UTC(year, month, day, (hour % 12) + (match[6] === "PM" ? 12 : 0), minute));
  if (date.getUTCMonth() !== month) return;
  return date.toISOString();
}

function directChild(node: HTMLElement, tag: string): HTMLElement | undefined {
  return node.children.find((child) => child.tagName === tag);
}

function text(node: HTMLElement | null | undefined): string {
  return node?.textContent.replace(/\s+/g, " ").trim() ?? "";
}

const execute = promisify(execFile);
const ORIGIN = "https://status.mistral.ai";

// Rootly serves this page to NSURLSession but currently rejects Node's TLS client.
// Use only built-in macOS networking, with no browser, shared cookies or credentials.
// The script is constant: URLs are arguments, never executable source.
const SCRIPT = `
ObjC.import("Cocoa");
function run(argv) {
  var config = $.NSURLSessionConfiguration.ephemeralSessionConfiguration;
  config.HTTPShouldSetCookies = false;
  config.requestCachePolicy = $.NSURLRequestReloadIgnoringLocalCacheData;
  config.timeoutIntervalForRequest = 6;
  config.timeoutIntervalForResource = 7;
  var session = $.NSURLSession.sessionWithConfigurationDelegateDelegateQueue(config, null, $.NSOperationQueue.mainQueue);
  var complete = false;
  var output = { error: "Mistral HTML request timed out" };
  var task = session.dataTaskWithURLCompletionHandler($.NSURL.URLWithString(argv[0]), function(data, response, error) {
    if (error && !error.isNil()) output = { error: ObjC.unwrap(error.localizedDescription) };
    else output = {
      status: Number(response.statusCode),
      url: ObjC.unwrap(response.URL.absoluteString),
      body: ObjC.unwrap($.NSString.alloc.initWithDataEncoding(data, $.NSUTF8StringEncoding))
    };
    complete = true;
  });
  task.resume;
  var deadline = Date.now() + 7500;
  while (!complete && Date.now() < deadline) {
    $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.05));
  }
  session.invalidateAndCancel;
  return JSON.stringify(output);
}
`;

export function mistralPageUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.origin !== ORIGIN ||
    url.username ||
    url.password ||
    !/^\/(?:history|incidents\/[a-f0-9-]{36})?$/.test(url.pathname)
  ) {
    throw new Error("Unexpected Mistral status page URL");
  }
  return url;
}

export const fetchMistralHtml: FetchText = async (value, signal) => {
  const url = mistralPageUrl(value).toString();
  signal.throwIfAborted();
  if (process.platform !== "darwin") return fetchText(url, signal);
  const { stdout } = await execute("/usr/bin/osascript", ["-l", "JavaScript", "-e", SCRIPT, url], {
    signal,
    timeout: 8_000,
    maxBuffer: 4 * 1024 * 1024,
    encoding: "utf8",
  });
  const response = requireRecord(JSON.parse(stdout), "Mistral HTML response");
  if (response.error) throw new Error("Mistral HTML request failed");
  const responseUrl = optionalString(response.url);
  if (!responseUrl || mistralPageUrl(responseUrl).toString() !== url) {
    throw new Error("Mistral HTML request redirected unexpectedly");
  }
  if (response.status !== 200 || typeof response.body !== "string") {
    throw new Error(`Mistral HTML source returned HTTP ${response.status}`);
  }
  return response.body;
};
