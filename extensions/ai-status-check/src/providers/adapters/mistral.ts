import type { ComponentHistoryLevel, ComponentStatus, Health } from "../../domain/types";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";
import { componentHistory, finitePercent, historyWindow, publishedPercentText } from "../utils/component-history";
import { stripHtml } from "../utils/rss";
import { optionalRecord, optionalRecordArray, optionalString } from "../utils/runtime-values";
import { mapFlexibleHealth, statusComponentId } from "../utils/status-normalization";
import { createPageAndFeedAdapter, type PageAndFeedAdapterConfig, type ParsedStatusPage } from "./page-and-feed";

export interface MistralAdapterConfig extends ProviderAdapterConfig {
  fetchText?: PageAndFeedAdapterConfig["fetchText"];
}

export function createMistralAdapter(config: MistralAdapterConfig): ProviderAdapter {
  return createPageAndFeedAdapter({
    ...config,
    feedUrl: "https://status.mistral.ai/feed.rss",
    parsePage: parseMistralStatusPage,
  });
}

export function parseMistralStatusPage(html: string, now = new Date()): ParsedStatusPage {
  const components: ComponentStatus[] = [];
  const histories = parseMistralComponentHistories(html, now);
  const cards = [...html.matchAll(/<[^>]+\baria-label="Card ([^"]+)"[^>]*>/g)];

  for (const [index, card] of cards.entries()) {
    if (card.index === undefined) continue;
    const group = stripHtml(card[1] ?? "");
    const nextCardIndex = cards[index + 1]?.index ?? html.length;
    components.push(...parseMistralServices(html.slice(card.index, nextCardIndex), group || undefined));
  }

  const groupedIds = new Set(components.map((component) => component.id));
  for (const component of parseMistralServices(html)) {
    if (!groupedIds.has(component.id)) components.push(component);
  }
  if (components.length === 0) throw new Error("Mistral status page contained no services");

  const summary = /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(html)?.[1];
  const statusText = summary ? stripHtml(summary) : undefined;
  return {
    reportedHealth: mapFlexibleHealth(statusText),
    statusText,
    components: uniqueComponents(components).map((component) => {
      const history = histories.get(component.id);
      return history ? { ...component, history } : component;
    }),
  };
}

export function parseMistralComponentHistories(html: string, now = new Date()) {
  const match = /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  if (!match?.[1]) return new Map<string, ComponentStatus["history"]>();
  let values: unknown[];
  try {
    values = JSON.parse(match[1]) as unknown[];
  } catch {
    return new Map<string, ComponentStatus["history"]>();
  }
  const root = optionalRecord(hydrateNuxtData(values, 0));
  const data = optionalRecord(root?.data);
  const uptimeEntry = data ? Object.entries(data).find(([key]) => key.startsWith("uptime-"))?.[1] : undefined;
  const cards = optionalRecordArray(optionalRecord(uptimeEntry)?.uptime);
  const result = new Map<string, ComponentStatus["history"]>();

  for (const card of cards) {
    for (const service of optionalRecordArray(card.services)) {
      const name = optionalString(service.name);
      if (!name) continue;
      const sourceDays = optionalRecordArray(service.days);
      if (sourceDays.length === 0) continue;
      const days = historyWindow(90, now, "not_monitored");
      const byDate = new Map(days.map((day) => [day.date, day]));
      for (const sourceDay of sourceDays) {
        const date = optionalString(sourceDay.date)?.slice(0, 10);
        const target = date ? byDate.get(date) : undefined;
        if (!target) continue;
        target.level = mistralDayLevel(optionalRecordArray(sourceDay.events));
      }
      const monitoredSince = sourceDays
        .map((day) => optionalString(day.date)?.slice(0, 10))
        .filter((date): date is string => Boolean(date))
        .sort()[0];
      const history = componentHistory("availability", days, {
        monitoredSince,
        uptimePercent: finitePercent(service.uptime),
        uptimeText: publishedPercentText(service.uptime),
      });
      if (history) result.set(statusComponentId(name), history);
    }
  }
  return result;
}

function mistralDayLevel(events: readonly Record<string, unknown>[]): ComponentHistoryLevel {
  if (events.length === 0) return "operational";
  const rank: Readonly<Record<string, number>> = { MINOR: 1, MEDIUM: 2, MAJOR: 3 };
  const severities = events
    .map((event) => optionalString(event.severity))
    .filter((severity): severity is string => Boolean(severity));
  const worst = severities
    .filter((severity) => rank[severity] !== undefined)
    .sort((left, right) => rank[right]! - rank[left]!)[0];
  if (worst === "MAJOR") return "major_outage";
  if (worst === "MEDIUM") return "partial_outage";
  if (worst === "MINOR") return "degraded";
  return "unknown";
}

const NUXT_REFERENCE_TAGS = new Set(["ShallowReactive", "Reactive", "Ref", "ShallowRef"]);

function hydrateNuxtData(values: unknown[], index: unknown, visiting = new Set<number>()): unknown {
  if (typeof index !== "number") return index;
  if (index < 0 || visiting.has(index)) return undefined;
  const value = values[index];
  visiting.add(index);
  try {
    if (Array.isArray(value)) {
      if (value.length === 2 && typeof value[0] === "string") {
        if (NUXT_REFERENCE_TAGS.has(value[0])) return hydrateNuxtData(values, value[1], visiting);
        if (value[0] === "Date") return value[1];
      }
      return value.map((item) => hydrateNuxtData(values, item, visiting));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, hydrateNuxtData(values, item, visiting)]),
      );
    }
    return value;
  } finally {
    visiting.delete(index);
  }
}

function parseMistralServices(html: string, group?: string): ComponentStatus[] {
  const components: ComponentStatus[] = [];
  for (const match of html.matchAll(/aria-label="Service ([^"]+)"/g)) {
    const name = stripHtml(match[1] ?? "");
    if (!name || match.index === undefined) continue;
    const tail = html.slice(match.index, match.index + 700);
    const color = /status-circle[^>]*\bbg-(green|yellow|amber|orange|red)-\d+/i.exec(tail)?.[1];
    components.push({ id: statusComponentId(name), name, group, health: colorHealth(color) });
  }
  return components;
}

function colorHealth(color: string | undefined): Health {
  if (color === "green") return "operational";
  if (color === "yellow" || color === "amber" || color === "orange") return "degraded";
  if (color === "red") return "major_outage";
  return "unknown";
}

function uniqueComponents(components: readonly ComponentStatus[]): ComponentStatus[] {
  return [...new Map(components.map((component) => [component.id, component])).values()];
}
