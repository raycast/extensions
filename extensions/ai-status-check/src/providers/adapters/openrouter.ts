import type { ComponentHistoryLevel, ComponentStatus } from "../../domain/types";
import type { ProviderAdapter, ProviderAdapterConfig } from "../types";
import { componentHistory, finitePercent, historyWindow, publishedPercentText } from "../utils/component-history";
import { stripHtml } from "../utils/rss";
import { mapFlexibleHealth, statusComponentId } from "../utils/status-normalization";
import { createPageAndFeedAdapter, type PageAndFeedAdapterConfig, type ParsedStatusPage } from "./page-and-feed";

export interface OpenRouterAdapterConfig extends ProviderAdapterConfig {
  fetchText?: PageAndFeedAdapterConfig["fetchText"];
}

export function createOpenRouterAdapter(config: OpenRouterAdapterConfig): ProviderAdapter {
  return createPageAndFeedAdapter({
    ...config,
    feedUrl: "https://status.openrouter.ai/incidents.rss",
    parsePage: parseOpenRouterStatusPage,
  });
}

export function parseOpenRouterStatusPage(html: string, now = new Date()): ParsedStatusPage {
  const components: ComponentStatus[] = [];
  const pattern = /<p class="[^"]*text-gray-900[^"]*">([\s\S]*?)<\/p>/gi;
  const matches = [...html.matchAll(pattern)];
  for (const [index, match] of matches.entries()) {
    const name = stripHtml(match[1] ?? "");
    const statusStart = (match.index ?? 0) + match[0].length;
    const nextComponentStart = matches[index + 1]?.index ?? html.length;
    const tail = html.slice(statusStart, nextComponentStart);
    const statusText = stripHtml(/<span\b[^>]*>([\s\S]*?)<\/span>/i.exec(tail)?.[1] ?? "");
    if (!name || !statusText) continue;
    const barColors = [...tail.matchAll(/class="[^"]*\bh-8\b[^"]*\bbg-([a-z]+)-500\b[^"]*"/gi)]
      .map((bar) => bar[1])
      .filter((color): color is string => Boolean(color));
    const days = barColors.length > 0 ? historyWindow(barColors.length, now, "unknown") : [];
    for (const [barIndex, color] of barColors.entries()) {
      const day = days[barIndex];
      if (day) day.level = openRouterBarLevel(color);
    }
    const uptimeText = /class="[^"]*underline[^"]*">\s*([\d.]+)(?:<!-- -->)?% uptime/i.exec(tail)?.[1];
    const history = componentHistory("availability", days, {
      uptimePercent: finitePercent(uptimeText),
      uptimeText: publishedPercentText(uptimeText),
    });
    components.push({
      id: statusComponentId(name),
      name,
      health: mapFlexibleHealth(statusText),
      statusText,
      ...(history ? { history } : {}),
    });
  }
  if (components.length === 0) throw new Error("Status page contained no components");

  const summary = /<p class="[^"]*font-medium text-lg[^"]*">([\s\S]*?)<\/p>/i.exec(html)?.[1];
  const statusText = summary ? stripHtml(summary) : undefined;
  return {
    reportedHealth: mapFlexibleHealth(statusText),
    statusText,
    components: uniqueComponents(components),
  };
}

function openRouterBarLevel(color: string): ComponentHistoryLevel {
  switch (color.toLowerCase()) {
    case "green":
      return "operational";
    case "yellow":
    case "amber":
      return "degraded";
    case "orange":
      return "partial_outage";
    case "red":
      return "major_outage";
    case "blue":
      return "maintenance";
    default:
      return "unknown";
  }
}

function uniqueComponents(components: readonly ComponentStatus[]): ComponentStatus[] {
  return [...new Map(components.map((component) => [component.id, component])).values()];
}
