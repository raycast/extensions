import { List } from "@raycast/api";
import { getActiveIncidents } from "../domain/provider-view";
import { providerStatusPresentation } from "../domain/status-presentation";
import type { ProviderStatusRecord } from "../domain/types";
import type { ProviderDefinition } from "../providers/types";
import { formatDateTime } from "../utils/dates";
import { buildProviderOverviewMarkdown } from "../utils/provider-overview-markdown";
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
  if (!snapshot) return null;
  const status = providerStatusPresentation(snapshot);

  return (
    <List.Section title="System Status">
      <List.Item
        id="provider-overview"
        icon={statusIcon(status.health, record.freshness)}
        title="Overview"
        keywords={[provider.name, status.label]}
        detail={
          <List.Item.Detail
            markdown={buildProviderOverviewMarkdown(record)}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Components" text={String(snapshot.components.length)} />
                <List.Item.Detail.Metadata.Label
                  title="Active Incidents"
                  text={String(getActiveIncidents(snapshot.incidents).length)}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Last Refreshed" text={formatDateTime(snapshot.fetchedAt)} />
                <List.Item.Detail.Metadata.Link
                  title="Source"
                  text="Official Status Page"
                  target={provider.statusPageUrl}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={<ProviderSourceActions provider={provider} onRefresh={onRefresh} />}
      />
    </List.Section>
  );
}
