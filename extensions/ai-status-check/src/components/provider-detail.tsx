import { Icon, List } from "@raycast/api";
import { getActiveIncidents, getRecentIncidents } from "../domain/provider-view";
import type { ProviderStatusRecord } from "../domain/types";
import { useRefreshableProviderRecord, type RefreshProvider } from "../hooks/use-refreshable-provider-record";
import type { ProviderDefinition } from "../providers/types";
import { ProviderSourceActions } from "./provider-actions";
import { ProviderComponents } from "./provider-components";
import { ActiveIncidents, RecentIncidents } from "./provider-incidents";
import { ProviderOverview } from "./provider-overview";

interface ProviderDetailProps {
  provider: ProviderDefinition;
  record: ProviderStatusRecord;
  onRefresh: RefreshProvider;
}

export function ProviderDetail({ provider, record, onRefresh }: ProviderDetailProps) {
  const { record: currentRecord, refresh } = useRefreshableProviderRecord(provider.id, record, onRefresh);
  const snapshot = currentRecord.snapshot;
  const incidents = snapshot?.incidents ?? [];
  const activeIncidents = getActiveIncidents(incidents);
  const recentIncidents = getRecentIncidents(incidents);

  return (
    <List
      isLoading={currentRecord.refreshState === "refreshing"}
      navigationTitle={`${provider.name} Status`}
      searchBarPlaceholder={`Search ${provider.name} components and incidents`}
    >
      {!snapshot ? (
        <List.EmptyView
          icon={Icon.WifiDisabled}
          title={`Could Not Load ${provider.name}`}
          description={currentRecord.refreshError ?? "No provider status is available."}
          actions={<ProviderSourceActions provider={provider} onRefresh={refresh} />}
        />
      ) : (
        <>
          <ActiveIncidents incidents={activeIncidents} provider={provider} onRefresh={refresh} />
          <ProviderOverview provider={provider} record={currentRecord} onRefresh={refresh} />
          <ProviderComponents
            provider={provider}
            record={currentRecord}
            refreshProvider={onRefresh}
            onRefresh={refresh}
          />
          <RecentIncidents incidents={recentIncidents} provider={provider} onRefresh={refresh} />
        </>
      )}
    </List>
  );
}
