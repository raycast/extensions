import { Icon, List } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";

import { SystemStat } from "../../types/system-stat";
import type { System } from "../../types/system";
import { useFormat } from "../../hooks/use-format";
import { usePreferences } from "../../hooks/use-preferences";
import { useListCollection } from "../../hooks/use-list-collection";
import { ListMetadataSectionHeader } from "../ListMetadataSectionHeader";
import { IntervalDropdown } from "../IntervalDropdown";
import { getSystemLoadIndicatorIcon } from "../../utils/icons";
import { renderStatValue } from "../../utils/stats";

/**
 * Calculate load average of the system (current: memory, cpu and docker)
 * @param stat
 * @returns 0 - 100
 */
const getAverageLoadPercentage = (stat: SystemStat) => {
  const respectedStats = [stat.stats?.cpu, stat.stats?.mp, stat.stats?.dp].filter(Boolean);
  return respectedStats.reduce((a, b) => a + b) / respectedStats.length;
};

export interface StatsDetailViewProps {
  system: System;
}

export function StatsDetailView({ system }: StatsDetailViewProps) {
  const preferences = usePreferences();
  const { dateTimeFormat } = useFormat();
  const [interval, setInterval] = useState<string>(preferences.defaultInterval);

  const { data, isLoading, revalidate, pagination } = useListCollection<SystemStat>("system_stats", {
    filter: `system='${system.id}'&&type='${interval}'`,
    sort: "-created",
  });

  const sortedData = useMemo(
    () => data.toSorted((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime()).toReversed(),
    [data],
  );

  const handleIntervalChange = useCallback(
    (id: string) => {
      setInterval(id);
      revalidate();
    },
    [interval],
  );

  return (
    <List
      key={`${interval}`}
      isLoading={isLoading}
      isShowingDetail
      pagination={pagination}
      navigationTitle={`Beszel - ${system.name}`}
      searchBarAccessory={<IntervalDropdown value={interval} onChange={handleIntervalChange} />}
    >
      {sortedData.map((stat) => (
        <List.Item
          key={stat.type + stat.created}
          accessories={[{ date: new Date(stat.created) }]}
          title={dateTimeFormat.format(new Date(stat.updated))}
          subtitle={`${renderStatValue(getAverageLoadPercentage(stat), "%", 0)}`}
          icon={getSystemLoadIndicatorIcon(getAverageLoadPercentage(stat))}
          detail={
            <List.Item.Detail
              key={`${interval}-${stat.type}-${stat.created}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <ListMetadataSectionHeader hasSpaceBefore={false} title="Usage" icon={Icon.MemoryChip} />
                  <List.Item.Detail.Metadata.Label
                    title="Docker CPU Usage"
                    text={`${renderStatValue(stat.stats.dp, "%")}`}
                  />
                  <List.Item.Detail.Metadata.Label title="CPU Usage" text={`${renderStatValue(stat.stats.cpu, "%")}`} />
                  <List.Item.Detail.Metadata.Label
                    title="Memory Usage"
                    text={`${renderStatValue(stat.stats.mp, "%")}`}
                  />
                  <ListMetadataSectionHeader title="Disk I/O" icon={Icon.HardDrive} />
                  <List.Item.Detail.Metadata.Label title="Usage" text={`${renderStatValue(stat.stats.dp, "%")}`} />
                  <List.Item.Detail.Metadata.Label title="Read" text={`${renderStatValue(stat.stats.dr, "MB/s")}`} />
                  <List.Item.Detail.Metadata.Label title="Write" text={`${renderStatValue(stat.stats.dw, "MB/s")}`} />
                  <ListMetadataSectionHeader title="Bandwidth" icon={Icon.Network} />
                  <List.Item.Detail.Metadata.Label title="Sent" text={`${renderStatValue(stat.stats.ns, "MB/s")}`} />
                  <List.Item.Detail.Metadata.Label
                    title="Received"
                    text={`${renderStatValue(stat.stats.nr, "MB/s")}`}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}
