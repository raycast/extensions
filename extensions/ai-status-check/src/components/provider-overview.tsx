import { List } from "@raycast/api";
import { providerStatusPresentation, providerUpdatedLabel } from "../domain/status-presentation";
import type { ProviderStatusRecord } from "../domain/types";
import type { ProviderDefinition } from "../providers/types";
import { ProviderSourceActions } from "./provider-actions";
import { statusIcon } from "./status-icon";

export function ProviderOverview({
  provider,
  record,
  onRefresh,
}: {
  provider: ProviderDefinition;
  record: ProviderStatusRecord;
  onRefresh(): Promise<void>;
}) {
  const snapshot = record.snapshot;
  if (!snapshot || (snapshot.health === "unknown" && !snapshot.statusText)) return null;
  const status = providerStatusPresentation(snapshot);

  return (
    <List.Section title="System Status">
      <List.Item
        icon={statusIcon(status.health, record.freshness)}
        title={status.label}
        accessories={[{ text: providerUpdatedLabel(snapshot), tooltip: activityTooltip(record) }]}
        actions={<ProviderSourceActions provider={provider} onRefresh={onRefresh} />}
      />
    </List.Section>
  );
}

function activityTooltip(record: ProviderStatusRecord): string | undefined {
  if (record.refreshError) return record.refreshError;
  if (record.snapshot) return `Last successful refresh: ${record.snapshot.fetchedAt}`;
  return undefined;
}
