import type { ComponentStatus, Health, Incident, IncidentUpdate } from "../../domain/types";
import { parseTimestamp } from "../../utils/dates";
import { parseRssItems, stripHtml } from "./rss";
import { optionalRecord, optionalRecordArray, optionalString, requireRecord } from "../utils/runtime-values";
import { mapFlexibleHealth, mapFlexibleIncidentState } from "../utils/status-normalization";

export interface ParsedInstatusSummary {
  reportedHealth: Health;
  statusText: string;
  components: ComponentStatus[];
}

export function parseInstatus(summaryPayload: unknown, componentsPayload: unknown): ParsedInstatusSummary {
  const summary = requireRecord(summaryPayload, "Instatus summary");
  const page = requireRecord(summary.page, "Instatus summary page");
  const statusText = optionalString(page.status);
  if (!statusText) throw new Error("Instatus summary did not contain a status");

  const componentsRoot = requireRecord(componentsPayload, "Instatus components");
  const components = optionalRecordArray(componentsRoot.components)
    .map<ComponentStatus | undefined>((component) => {
      const id = optionalString(component.id);
      const name = optionalString(component.name);
      const status = optionalString(component.status);
      if (!id || !name || !status) return undefined;
      return {
        id,
        name,
        health: mapFlexibleHealth(status),
        statusText: status,
        group:
          optionalString(optionalRecord(component.group)?.name) ??
          optionalString(component.group) ??
          optionalString(optionalRecord(component.parent)?.name),
      } satisfies ComponentStatus;
    })
    .filter((component): component is ComponentStatus => component !== undefined);

  return { reportedHealth: mapFlexibleHealth(statusText), statusText, components };
}

export function parseInstatusHistory(xml: string, components: readonly ComponentStatus[]): Incident[] {
  const componentIds = new Map(components.map((component) => [component.name.toLowerCase(), component.id]));

  return parseRssItems(xml)
    .map((item): Incident | undefined => {
      const id = (item.guid ?? item.link)?.split("/").filter(Boolean).at(-1);
      if (!id || !item.publishedAt) return undefined;

      const description = stripHtml(item.description ?? "");
      const type = /^Type:\s*([^\n]+)/im.exec(description)?.[1]?.trim();
      const affectedNames =
        /Affected Components:\s*(.*?)(?=\s+[A-Z][a-z]{2}\s+\d{1,2},\s+\d{2}:\d{2}:\d{2}\s+GMT|$)/is
          .exec(description)?.[1]
          ?.split(",")
          .map((name) => name.trim())
          .filter(Boolean) ?? [];
      const updates = parseInstatusUpdates(id, description, item.publishedAt).sort(
        (left, right) => parseTimestamp(left.createdAt) - parseTimestamp(right.createdAt),
      );
      const latest = updates.at(-1);
      const state = latest?.state ?? (type?.toLowerCase() === "maintenance" ? "scheduled" : "unknown");
      const isMaintenance = type?.toLowerCase() === "maintenance";

      return {
        id,
        title: item.title,
        health: isMaintenance ? "maintenance" : "degraded",
        state,
        stateText: latest?.stateText,
        startedAt: updates[0]?.createdAt ?? item.publishedAt,
        updatedAt: latest?.createdAt ?? item.publishedAt,
        resolvedAt: state === "resolved" ? latest?.createdAt : undefined,
        affectedComponentIds: affectedNames
          .map((name) => componentIds.get(name.toLowerCase()))
          .filter((componentId): componentId is string => componentId !== undefined),
        updates,
        url: item.link,
      };
    })
    .filter((incident): incident is Incident => incident !== undefined)
    .sort((left, right) => parseTimestamp(right.startedAt) - parseTimestamp(left.startedAt));
}

function parseInstatusUpdates(incidentId: string, description: string, publishedAt: string): IncidentUpdate[] {
  const year = new Date(publishedAt).getUTCFullYear();
  const pattern =
    /\b([A-Z][a-z]{2})\s+(\d{1,2}),\s+(\d{2}:\d{2}:\d{2})\s+GMT([+-]\d+(?::\d+)?)\s+-\s+([^-]+?)\s+-\s+([\s\S]*?)(?=\s+[A-Z][a-z]{2}\s+\d{1,2},\s+\d{2}:\d{2}:\d{2}\s+GMT[+-]\d+(?::\d+)?\s+-|$)/g;
  const updates: IncidentUpdate[] = [];

  for (const [index, match] of [...description.matchAll(pattern)].entries()) {
    const [, month, day, time, offset, stateText, body] = match;
    const parsedTime = Date.parse(`${month} ${day}, ${year} ${time} GMT${offset}`);
    if (!stateText || !body || !Number.isFinite(parsedTime)) continue;
    updates.push({
      id: `${incidentId}-${index}`,
      state: mapFlexibleIncidentState(stateText.trim()),
      stateText: stateText.trim(),
      body: body.trim().replace(/\s+/g, " "),
      createdAt: new Date(parsedTime).toISOString(),
    });
  }

  return updates;
}
