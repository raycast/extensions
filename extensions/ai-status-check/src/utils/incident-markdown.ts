import { incidentImpactLabel, incidentStateLabel, incidentUpdateStateLabel } from "../domain/status-presentation";
import type { Incident } from "../domain/types";
import { formatDateTime } from "./dates";
import { escapeMarkdown } from "./markdown";

export function buildIncidentMarkdown(incident: Incident): string {
  const lines = [`### ${escapeMarkdown(incident.title)}`];

  if (incident.updates.length > 0) {
    lines.push("", "Updates");
    for (const update of incident.updates) {
      lines.push(
        "",
        `**${escapeMarkdown(incidentUpdateStateLabel(update))}** · ${formatDateTime(update.createdAt) ?? "Unknown time"}`,
        "",
        escapeMarkdown(update.body),
      );
    }
  }

  return lines.join("\n");
}

export function buildIncidentMetadata(incident: Incident): { title: string; text: string }[] {
  const fields = [
    ["State", incidentStateLabel(incident)],
    ["Impact", incidentImpactLabel(incident)],
    ["Started", formatDateTime(incident.startedAt)],
    ["Last Updated", formatDateTime(incident.updatedAt)],
    ["Resolved", formatDateTime(incident.resolvedAt)],
  ] as const;
  return fields.flatMap(([title, text]) => (text ? [{ title, text }] : []));
}
