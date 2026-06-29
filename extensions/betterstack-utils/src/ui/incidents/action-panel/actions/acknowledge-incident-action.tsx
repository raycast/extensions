import { Action, Icon } from "@raycast/api";
import { Incident } from "@/domain/incident";

type AcknowledgeIncidentActionProps = {
  incident: Incident;
  onAcknowledge: () => void;
};

export function AcknowledgeIncidentAction({ incident, onAcknowledge }: AcknowledgeIncidentActionProps) {
  if (incident.status !== "Started") return null;
  return (
    <Action
      title="Acknowledge"
      icon={Icon.Checkmark}
      onAction={onAcknowledge}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
    />
  );
}
