import { ActionPanel } from "@raycast/api";
import { Incident } from "@/domain/incident";
import { AcknowledgeIncidentAction } from "@/ui/incidents/action-panel/actions/acknowledge-incident-action";
import { ResolveIncidentAction } from "@/ui/incidents/action-panel/actions/resolve-incident-action";
import { OpenIncidentInBrowserAction } from "@/ui/incidents/action-panel/actions/open-incident-in-browser-action";
import { CreateIncidentAction } from "@/ui/incidents/action-panel/actions/create-incident-action";
import { RefreshAction } from "@/ui/incidents/action-panel/actions/refresh-action";

interface IncidentActionPanelProps {
  incident: Incident;
  webUrl: string;
  onAcknowledge: () => void;
  onResolve: () => void;
  onRefresh: () => void;
}

export function IncidentActionPanel({
  incident,
  webUrl,
  onAcknowledge,
  onResolve,
  onRefresh,
}: IncidentActionPanelProps) {
  return (
    <ActionPanel>
      <AcknowledgeIncidentAction incident={incident} onAcknowledge={onAcknowledge} />
      <ResolveIncidentAction incident={incident} onResolve={onResolve} />
      <OpenIncidentInBrowserAction url={webUrl} />
      <CreateIncidentAction />
      <RefreshAction onRefresh={onRefresh} />
    </ActionPanel>
  );
}
