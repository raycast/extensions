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

// Raycast sizes tags to their text, so the shorter labels are padded with en spaces (0.5em) and thin
// spaces (0.2em) on both sides to roughly match the width of "Acknowledged" and keep the pills aligned.
// Raycast trims whitespace from tag values, so the padding is anchored with zero-width spaces, which are
// invisible but not classed as whitespace.
const EN_SPACE = "\u2002";
const THIN_SPACE = "\u2009";
const ZERO_WIDTH_SPACE = "\u200b";

function padBothSides(label: string, padding: string): string {
  return `${ZERO_WIDTH_SPACE}${padding}${label}${padding}${ZERO_WIDTH_SPACE}`;
}

const STATUS_LABEL: Record<IncidentStatus, string> = {
  [IncidentStatus.Started]: padBothSides(IncidentStatus.Started, EN_SPACE.repeat(3) + THIN_SPACE),
  [IncidentStatus.Acknowledged]: IncidentStatus.Acknowledged,
  [IncidentStatus.Resolved]: padBothSides(IncidentStatus.Resolved, EN_SPACE.repeat(2) + THIN_SPACE),
};

export function IncidentListItem({ incident, webUrl, onAcknowledge, onResolve, onRefresh }: IncidentListItemProps) {
  return (
    <List.Item
      title={incident.summary ?? incident.name}
      subtitle={incident.cause}
      accessories={[
        { date: new Date(incident.startedAt), tooltip: "Started" },
        {
          tag: { value: STATUS_LABEL[incident.status], color: STATUS_COLOR[incident.status] },
          tooltip: incident.status,
        },
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
