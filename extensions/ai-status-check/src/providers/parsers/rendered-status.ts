import type { ComponentStatus, Health } from "../../domain/types";
import { normalizeStatusToken } from "../../utils/status-token";
import { stripHtml } from "./rss";
import { mapFlexibleHealth } from "../utils/status-normalization";

export interface ParsedRenderedStatus {
  reportedHealth: Health;
  statusText?: string;
  components: ComponentStatus[];
}

export function parseMistralStatusPage(html: string): ParsedRenderedStatus {
  const components: ComponentStatus[] = [];
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
    components: uniqueComponents(components),
  };
}

export function parseOnlineOrNotStatusPage(html: string): ParsedRenderedStatus {
  const components: ComponentStatus[] = [];
  const pattern = /<p class="[^"]*text-gray-900[^"]*">([\s\S]*?)<\/p>/gi;
  const matches = [...html.matchAll(pattern)];
  for (const [index, match] of matches.entries()) {
    const name = stripHtml(match[1] ?? "");
    const statusStart = (match.index ?? 0) + match[0].length;
    const nextComponentStart = matches[index + 1]?.index ?? html.length;
    const tail = html.slice(statusStart, Math.min(nextComponentStart, statusStart + 2_000));
    const statusText = stripHtml(/<span\b[^>]*>([\s\S]*?)<\/span>/i.exec(tail)?.[1] ?? "");
    if (!name || !statusText) continue;
    components.push({ id: renderedComponentId(name), name, health: mapFlexibleHealth(statusText), statusText });
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

export function renderedComponentId(name: string): string {
  return normalizeStatusToken(name).replaceAll("_", "-");
}

function parseMistralServices(html: string, group?: string): ComponentStatus[] {
  const components: ComponentStatus[] = [];
  for (const match of html.matchAll(/aria-label="Service ([^"]+)"/g)) {
    const name = stripHtml(match[1] ?? "");
    if (!name || match.index === undefined) continue;
    const tail = html.slice(match.index, match.index + 700);
    const color = /status-circle[^>]*\bbg-(green|yellow|amber|orange|red)-\d+/i.exec(tail)?.[1];
    components.push({ id: renderedComponentId(name), name, group, health: colorHealth(color) });
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
