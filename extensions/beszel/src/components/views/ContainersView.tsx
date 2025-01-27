import { List } from "@raycast/api";
import { useCallback, useState } from "react";

import { useListCollection } from "../../hooks/use-list-collection";
import type { System } from "../../types/system";
import type { ContainerStat } from "../../types/container-stat";
import { ClusteredContainersView } from "./layouts/ClusteredContainersView";
import { AlphabeticalContainersView } from "./layouts/AlphabeticalContainersView";
import { usePreferences } from "../../hooks/use-preferences";

export interface ContainersViewProps {
  system: System;
}

export function ContainersView({ system }: ContainersViewProps) {
  const preferences = usePreferences();
  const [viewMode, setViewMode] = useState<string | null>("clustered");

  const { data, isLoading, revalidate } = useListCollection<ContainerStat>("container_stats", {
    filter: `system='${system.id}'&&type='${preferences.observationInterval}'`,
    sort: "-created",
    perPage: preferences.observationIntervalsCount, // info: each entry contains ALL containers!
  });

  const handleViewModeChange = useCallback(
    (id: string) => {
      setViewMode(id);
      revalidate();
    },
    [viewMode],
  );

  const containerIds = data
    .map((entry) => entry.stats.map((containerStat) => containerStat.n))
    .flat()
    .filter((v, i, a) => a.indexOf(v) === i)
    .toSorted();

  return (
    <List
      key={`${viewMode}`}
      isLoading={isLoading}
      navigationTitle={`Beszel - ${system.name} - Containers`}
      searchBarPlaceholder={`Search ${containerIds.length} containers`}
      searchBarAccessory={
        <List.Dropdown
          value={viewMode || "clustered"}
          onChange={handleViewModeChange}
          tooltip="Select view mode"
          defaultValue="clustered"
        >
          <List.Dropdown.Item title="Clustered" value="clustered" />
          <List.Dropdown.Item title="Alphabetical" value="alphabetical" />
        </List.Dropdown>
      }
    >
      {viewMode === "clustered" && (
        <ClusteredContainersView system={system} containers={data} containerIds={containerIds} />
      )}
      {viewMode === "alphabetical" && (
        <AlphabeticalContainersView system={system} containers={data} containerIds={containerIds} />
      )}
    </List>
  );
}
