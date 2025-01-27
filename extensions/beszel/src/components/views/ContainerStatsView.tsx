import { Icon, List } from "@raycast/api";
import { useCallback, useState } from "react";

import { useListCollection } from "../../hooks/use-list-collection";
import type { System } from "../../types/system";
import type { ContainerStat } from "../../types/container-stat";
import { getSystemLoadIndicatorIcon } from "../../utils/icons";
import { useFormat } from "../../hooks/use-format";
import { ListMetadataSectionHeader } from "../ListMetadataSectionHeader";
import { renderStatValue } from "../../utils/stats";
import { IntervalDropdown } from "../IntervalDropdown";
import { usePreferences } from "../../hooks/use-preferences";
import { getAverageContainerLoadPercentage } from "../../utils/load-calculation";

export interface ContainerStatsViewProps {
  system: System;
  containerId: string;
}

export function ContainerStatsView({ system, containerId }: ContainerStatsViewProps) {
  const preferences = usePreferences();
  const { dateTimeFormat } = useFormat();
  const [interval, setInterval] = useState<string>(preferences.defaultInterval);

  const { data, isLoading, pagination, revalidate } = useListCollection<ContainerStat>("container_stats", {
    filter: `system='${system.id}'&&type='${interval}'`,
    sort: "-created",
  });

  const handleIntervalChange = useCallback(
    (id: string) => {
      setInterval(id);
      revalidate();
    },
    [interval],
  );

  return (
    <List
      isShowingDetail
      key={`${interval}`}
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={`Beszel - ${system.name} - ${containerId} `}
      searchBarAccessory={<IntervalDropdown value={interval} onChange={handleIntervalChange} />}
    >
      {data.map((entry) => {
        const stat = entry.stats.find((entry) => entry.n === containerId)!;
        const avgLoad = getAverageContainerLoadPercentage(stat);
        return (
          <List.Item
            key={entry.type + entry.created + containerId}
            accessories={[{ date: new Date(entry.created) }]}
            title={dateTimeFormat.format(new Date(entry.updated))}
            subtitle={`${renderStatValue(avgLoad, "%", 0)}`}
            icon={getSystemLoadIndicatorIcon(avgLoad)}
            detail={
              <List.Item.Detail
                key={`${interval}-${entry.type}-${entry.created}`}
                metadata={
                  <List.Item.Detail.Metadata>
                    <ListMetadataSectionHeader hasSpaceBefore={false} title="Usage" icon={Icon.MemoryChip} />
                    <List.Item.Detail.Metadata.Label title="CPU Usage" text={`${renderStatValue(stat?.c, "%")}`} />
                    <List.Item.Detail.Metadata.Label title="Memory Usage" text={`${renderStatValue(stat?.m, "MB")}`} />
                    <ListMetadataSectionHeader title="Bandwidth" icon={Icon.Network} />
                    <List.Item.Detail.Metadata.Label title="Sent" text={`${renderStatValue(stat?.ns, "MB/s")}`} />
                    <List.Item.Detail.Metadata.Label title="Received" text={`${renderStatValue(stat?.nr, "MB/s")}`} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
}
