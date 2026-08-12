import { Image, List } from "@raycast/api";
import {
  providerStatusPresentation as snapshotStatusPresentation,
  type StatusPresentation,
} from "../domain/status-presentation";
import { highestHealth } from "../domain/derive-health";
import { getActiveIncidents } from "../domain/provider-view";
import type { Incident, ProviderStatusRecord } from "../domain/types";
import type { ProviderDefinition } from "../providers/types";
import { ProviderListActions } from "./provider-actions";
import { ProviderDetail } from "./provider-detail";
import { statusIcon } from "./status-icon";

interface ProviderListItemProps {
  provider: ProviderDefinition;
  record: ProviderStatusRecord;
  onRefreshAll(): Promise<void>;
  onRefreshProvider(providerId: string): Promise<ProviderStatusRecord | undefined>;
}

export function ProviderListItem({ provider, record, onRefreshAll, onRefreshProvider }: ProviderListItemProps) {
  const snapshot = record.snapshot;
  const activeIncidents = getActiveIncidents(snapshot?.incidents ?? []);
  const hasOverallStatus = Boolean(snapshot && (snapshot.statusText || snapshot.health !== "unknown"));
  const status = providerListStatus(record, activeIncidents);
  const metadata = snapshot
    ? providerMetadata(hasOverallStatus ? activeIncidents.length : 0, snapshot.components.length)
    : undefined;
  const accessories: List.Item.Accessory[] = [
    {
      icon: statusIcon(status.health, record.freshness),
      text: status.label,
      tooltip: record.refreshError ?? status.label,
    },
  ];
  if (metadata) accessories.push({ text: metadata, tooltip: accessoryTooltip(record) });

  return (
    <List.Item
      id={provider.id}
      icon={{ source: provider.icon, mask: Image.Mask.RoundedRectangle }}
      title={provider.name}
      keywords={[...provider.aliases, ...(snapshot?.components.map((component) => component.name) ?? [])]}
      accessories={accessories}
      actions={
        <ProviderListActions
          provider={provider}
          detail={<ProviderDetail provider={provider} record={record} onRefresh={onRefreshProvider} />}
          onRefreshAll={onRefreshAll}
        />
      }
    />
  );
}

function providerListStatus(record: ProviderStatusRecord, activeIncidents: readonly Incident[]): StatusPresentation {
  if (!record.snapshot || record.freshness === "expired" || record.freshness === "unavailable") {
    return { label: record.refreshState === "refreshing" ? "Loading" : "Unavailable", health: "unknown" };
  }
  if (record.snapshot.health === "unknown" && !record.snapshot.statusText) {
    if (activeIncidents.length === 0) return { label: "No Overall Status", health: "unknown" };
    return {
      label: `${activeIncidents.length} active incident${activeIncidents.length === 1 ? "" : "s"}`,
      health: highestHealth(
        activeIncidents.map((incident) => (incident.state === "scheduled" ? "maintenance" : incident.health)),
      ),
    };
  }
  return snapshotStatusPresentation(record.snapshot);
}

function providerMetadata(activeIncidentCount: number, componentCount: number): string | undefined {
  if (activeIncidentCount > 0) {
    return `${activeIncidentCount} active incident${activeIncidentCount === 1 ? "" : "s"}`;
  }
  if (componentCount > 0) {
    return `${componentCount} component${componentCount === 1 ? "" : "s"}`;
  }
  return undefined;
}

function accessoryTooltip(record: ProviderStatusRecord): string | undefined {
  if (record.refreshState === "failed") return record.refreshError;
  if (record.snapshot) return `Last successful refresh: ${record.snapshot.fetchedAt}`;
  return undefined;
}
