import { Action, ActionPanel, List, type LaunchProps } from "@raycast/api";
import { useState } from "react";

import { useListCollection } from "./hooks/use-list-collection";
import { System } from "./types/system";
import type { Alert } from "./types/alert";
import { AlertListItem } from "./components/AlertListItem";

export default function AlertsCommand({ launchContext }: LaunchProps) {
  const [searchText, setSearchText] = useState(launchContext?.search || "");
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { data, isLoading, pagination } = useListCollection<Alert>("alerts");
  const systemsLoader = useListCollection<System>("systems");

  const clusterBySystems = data.reduce(
    (prev, curr) => ({
      ...prev,
      [curr.system]: [...(prev[curr.system as keyof typeof prev] || []), curr],
    }),
    {} as Record<string, Alert[]>,
  );

  return (
    <List
      navigationTitle="Beszel - Alerts"
      isShowingDetail={isShowingDetail}
      isLoading={isLoading || systemsLoader.isLoading}
      filtering={true}
      searchBarPlaceholder="Search Alerts or Systems"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      pagination={pagination}
      actions={
        <ActionPanel>
          <Action title="Toggle Details" onAction={() => setIsShowingDetail(!isShowingDetail)} />
        </ActionPanel>
      }
    >
      {Object.keys(clusterBySystems).map((systemId) => {
        const alertsInSystem = clusterBySystems[systemId];
        const systemName = systemsLoader.data.find((entry) => entry.id === systemId)?.name || systemId;

        return (
          <List.Section key={systemId} title={systemName} subtitle={`${alertsInSystem.length}`}>
            {clusterBySystems[systemId].map((alert) => (
              <AlertListItem key={alert.id} alert={alert} keywords={[systemName]} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
