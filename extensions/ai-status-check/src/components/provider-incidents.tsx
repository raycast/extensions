import { Detail, Icon, List } from "@raycast/api";
import {
  incidentActivityLabel,
  incidentImpactLabel,
  incidentStateLabel,
  incidentUpdateStateLabel,
} from "../domain/status-presentation";
import type { Incident } from "../domain/types";
import type { ProviderDefinition } from "../providers/types";
import { formatDateTime } from "../utils/dates";
import { escapeMarkdown } from "../utils/markdown";
import { IncidentActions, IncidentDetailActions, ProviderSourceActions } from "./provider-actions";
import { incidentIcon } from "./status-icon";

interface IncidentSectionProps {
  incidents: readonly Incident[];
  provider: ProviderDefinition;
  onRefresh(): Promise<void>;
}

export function ActiveIncidents({ incidents, provider, onRefresh }: IncidentSectionProps) {
  if (incidents.length === 0) return null;

  return (
    <List.Section title="Active Incidents">
      {incidents.map((incident) => (
        <IncidentItem key={incident.id} incident={incident} provider={provider} onRefresh={onRefresh} />
      ))}
    </List.Section>
  );
}

export function RecentIncidents({ incidents, provider, onRefresh }: IncidentSectionProps) {
  return (
    <List.Section title="Recent Incidents">
      {incidents.length > 0 ? (
        incidents.map((incident) => (
          <IncidentItem key={incident.id} incident={incident} provider={provider} onRefresh={onRefresh} />
        ))
      ) : (
        <List.Item
          icon={Icon.CheckCircle}
          title="No Recent Incidents"
          subtitle="No resolved incidents were published in the last 30 days"
          actions={<ProviderSourceActions provider={provider} onRefresh={onRefresh} />}
        />
      )}
    </List.Section>
  );
}

function IncidentItem({
  incident,
  provider,
  onRefresh,
}: {
  incident: Incident;
  provider: ProviderDefinition;
  onRefresh(): Promise<void>;
}) {
  const activity = incidentActivityLabel(incident);
  const accessories: List.Item.Accessory[] = [{ text: incidentStateLabel(incident) }];
  if (activity) accessories.push({ text: activity });

  return (
    <List.Item
      icon={incidentIcon(incident)}
      title={incident.title}
      accessories={accessories}
      actions={
        <IncidentActions
          incident={incident}
          provider={provider}
          target={<IncidentDetail incident={incident} provider={provider} />}
          onRefresh={onRefresh}
        />
      }
    />
  );
}

function IncidentDetail({ incident, provider }: { incident: Incident; provider: ProviderDefinition }) {
  return (
    <Detail
      navigationTitle={incident.title}
      markdown={incidentMarkdown(incident)}
      actions={<IncidentDetailActions incident={incident} provider={provider} />}
    />
  );
}

function incidentMarkdown(incident: Incident): string {
  const lines = [
    `# ${escapeMarkdown(incident.title)}`,
    "",
    `**State:** ${escapeMarkdown(incidentStateLabel(incident))}`,
  ];
  const impact = incidentImpactLabel(incident);
  if (impact) lines.push(`**Impact:** ${escapeMarkdown(impact)}`);

  const startedAt = formatDateTime(incident.startedAt);
  const updatedAt = formatDateTime(incident.updatedAt);
  const resolvedAt = formatDateTime(incident.resolvedAt);
  if (startedAt) lines.push(`**Started:** ${startedAt}`);
  if (updatedAt) lines.push(`**Updated:** ${updatedAt}`);
  if (resolvedAt) lines.push(`**Resolved:** ${resolvedAt}`);

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
