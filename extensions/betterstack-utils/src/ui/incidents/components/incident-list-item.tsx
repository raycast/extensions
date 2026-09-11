import { Color, List } from "@raycast/api";
import { Incident, IncidentStatus } from "@/domain/incident";
import { IncidentActionPanel } from "@/ui/incidents/action-panel/incident-action-panel";

interface IncidentListItemProps {
  incident: Incident;
  webUrl: string;
  onAcknowledge: (incident: Incident) => void;
  onResolve: (incident: Incident) => void;
  onRefresh: () => void;
}

const STATUS_COLOR: Record<IncidentStatus, Color> = {
  [IncidentStatus.Started]: Color.Red,
  [IncidentStatus.Acknowledged]: Color.Yellow,
  [IncidentStatus.Resolved]: Color.Green,
};

export function IncidentListItem({ incident, webUrl, onAcknowledge, onResolve, onRefresh }: IncidentListItemProps) {
  return (
    <List.Item
      title={incident.summary ?? incident.name}
      subtitle={incident.cause}
      accessories={[
        { date: new Date(incident.startedAt), tooltip: "Started" },
        { tag: { value: incident.status, color: STATUS_COLOR[incident.status] } },
      ]}
      actions={
        <IncidentActionPanel
          incident={incident}
          webUrl={webUrl}
          onAcknowledge={() => onAcknowledge(incident)}
          onResolve={() => onResolve(incident)}
          onRefresh={onRefresh}
        />
      }
    />
  );
}
