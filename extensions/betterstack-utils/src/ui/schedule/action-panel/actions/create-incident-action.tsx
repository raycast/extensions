import { Action, Icon, Keyboard } from "@raycast/api";
import { IncidentForm } from "@/ui/incidents/incident-form";

export function CreateIncidentAction() {
  return (
    <Action.Push
      title="Create Incident"
      icon={Icon.Plus}
      target={<IncidentForm />}
      shortcut={Keyboard.Shortcut.Common.New}
    />
  );
}
