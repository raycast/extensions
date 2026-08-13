import { Detail, Icon, List } from "@raycast/api";
import { incidentActivityLabel, incidentStateLabel } from "../domain/status-presentation";
import type { Incident } from "../domain/types";
import type { ProviderDefinition } from "../providers/types";
import { buildIncidentMarkdown } from "../utils/incident-markdown";
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
          id="recent-incidents-empty"
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
      id={`incident:${incident.id}`}
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
      markdown={buildIncidentMarkdown(incident)}
      actions={<IncidentDetailActions incident={incident} provider={provider} />}
    />
  );
}
