import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { getActiveIncidents, getRecentIncidents } from "../domain/provider-view";
import { useProviderRecord } from "../hooks/use-provider-record";
import type { ProviderStatusStore } from "../services/provider-status-store";
import type { ProviderDefinition } from "../providers/types";
import { ProviderSourceActions } from "./provider-actions";
import { ProviderComponents } from "./provider-components";
import { ActiveIncidents, RecentIncidents } from "./provider-incidents";
import { ProviderOverview } from "./provider-overview";

interface ProviderDetailProps {
  provider: ProviderDefinition;
  store: ProviderStatusStore;
}

export function ProviderDetail({ provider, store }: ProviderDetailProps) {
  const { record: currentRecord, refresh } = useProviderRecord(store, provider.id);
  const [filter, setFilter] = useState("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const snapshot = currentRecord.snapshot;
  const incidents = snapshot?.incidents ?? [];
  const activeIncidents = getActiveIncidents(incidents);
  const recentIncidents = getRecentIncidents(incidents);

  return (
    <List
      isShowingDetail
      isLoading={currentRecord.refreshState === "refreshing"}
      navigationTitle={`${provider.name} Status`}
      searchBarPlaceholder={`Search ${provider.name} components and incidents`}
      onSelectionChange={setSelectedItemId}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter provider details" value={filter} onChange={setFilter}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Components" value="components" />
          <List.Dropdown.Item title="Incidents" value="incidents" />
        </List.Dropdown>
      }
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
          {filter !== "components" ? (
            <ActiveIncidents incidents={activeIncidents} provider={provider} onRefresh={refresh} />
          ) : null}
          {filter === "all" ? (
            <ProviderOverview provider={provider} record={currentRecord} onRefresh={refresh} />
          ) : null}
          {filter !== "incidents" ? (
            <ProviderComponents
              provider={provider}
              record={currentRecord}
              store={store}
              onRefresh={refresh}
              selectedItemId={selectedItemId}
            />
          ) : null}
          {filter !== "components" ? (
            <RecentIncidents
              incidents={recentIncidents}
              provider={provider}
              onRefresh={refresh}
              availability={snapshot.incidentHistoryAvailability}
            />
          ) : null}
        </>
      )}
    </List>
  );
}
