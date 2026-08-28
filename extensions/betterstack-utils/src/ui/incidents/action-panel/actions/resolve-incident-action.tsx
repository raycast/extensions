import { Action, Icon } from "@raycast/api";
import { Incident, IncidentStatus } from "@/domain/incident";

type ResolveIncidentActionProps = {
  incident: Incident;
  onResolve: () => void;
};

export function ResolveIncidentAction({ incident, onResolve }: ResolveIncidentActionProps) {
  if (incident.status === IncidentStatus.Resolved) return null;
  return (
    <Action
      title="Resolve"
      icon={Icon.CheckCircle}
      onAction={onResolve}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
    />
  );
}
