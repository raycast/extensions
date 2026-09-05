import { incidentImpactLabel, incidentStateLabel, incidentUpdateStateLabel } from "../domain/status-presentation";
import type { Incident } from "../domain/types";
import { formatDateTime } from "./dates";
import { escapeMarkdown } from "./markdown";

export function buildIncidentMarkdown(incident: Incident): string {
  const lines = [
    `# ${escapeMarkdown(incident.title)}`,
    "",
    `- **State:** ${escapeMarkdown(incidentStateLabel(incident))}`,
  ];
  const impact = incidentImpactLabel(incident);
  if (impact) lines.push(`- **Impact:** ${escapeMarkdown(impact)}`);

  const startedAt = formatDateTime(incident.startedAt);
  const updatedAt = formatDateTime(incident.updatedAt);
  const resolvedAt = formatDateTime(incident.resolvedAt);
  if (startedAt) lines.push(`- **Started:** ${startedAt}`);
  if (updatedAt) lines.push(`- **Last updated:** ${updatedAt}`);
  if (resolvedAt) lines.push(`- **Resolved:** ${resolvedAt}`);

  if (incident.updates.length > 0) {
    lines.push("", "## Updates");
    for (const update of incident.updates) {
      lines.push(
        "",
        `### ${escapeMarkdown(incidentUpdateStateLabel(update))} · ${formatDateTime(update.createdAt) ?? "Unknown time"}`,
        "",
        escapeMarkdown(update.body),
      );
    }
  }

  return lines.join("\n");
}
