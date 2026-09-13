import { Icon, List } from "@raycast/api";
import { incidentStateLabel, incidentHistoryMessage } from "../domain/status-presentation";
import type { DataAvailability, Incident } from "../domain/types";
import type { ProviderDefinition } from "../providers/types";
import { buildIncidentMarkdown, buildIncidentMetadata } from "../utils/incident-markdown";
import { IncidentActions } from "./provider-actions";
import { ProviderNotice } from "./provider-notice";
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

export function RecentIncidents({
  incidents,
  provider,
  onRefresh,
  availability,
}: IncidentSectionProps & { availability?: DataAvailability }) {
  const message = incidentHistoryMessage(availability);
  return (
    <List.Section title="Recent Incidents">
      {incidents.length > 0 ? (
        incidents.map((incident) => (
          <IncidentItem key={incident.id} incident={incident} provider={provider} onRefresh={onRefresh} />
        ))
      ) : (
        <ProviderNotice
          id="recent-incidents-empty"
          icon={availability === "available" ? Icon.CheckCircle : Icon.Info}
          title={message.title}
          description={message.description}
          provider={provider}
          onRefresh={onRefresh}
        />
      )}
      {incidents.length > 0 && availability === "unavailable" ? (
        <ProviderNotice
          id="recent-incidents-incomplete"
          icon={Icon.Info}
          title="Some Incident History Is Unavailable"
          description="Showing the incidents that could be retrieved. Open the official status page for the full history."
          provider={provider}
          onRefresh={onRefresh}
        />
      ) : null}
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
  return (
    <List.Item
      id={`incident:${incident.id}`}
      icon={incidentIcon(incident)}
      title={incident.title}
      keywords={[incidentStateLabel(incident)]}
      detail={
        <List.Item.Detail
          markdown={buildIncidentMarkdown(incident)}
          metadata={
            <List.Item.Detail.Metadata>
              {buildIncidentMetadata(incident).map(({ title, text }) => (
                <List.Item.Detail.Metadata.Label key={title} title={title} text={text} />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<IncidentActions incident={incident} provider={provider} onRefresh={onRefresh} />}
    />
  );
}
