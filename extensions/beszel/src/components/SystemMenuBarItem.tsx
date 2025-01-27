import { captureException, Color, Icon, Keyboard, MenuBarExtra, open } from "@raycast/api";
import { useCallback, useMemo } from "react";

import { useListCollection } from "../hooks/use-list-collection";
import type { Alert } from "../types/alert";
import type { System } from "../types/system";
import { getSystemLoadIndicatorIcon } from "../utils/icons";
import { average, getAverageSystemLoadPercentage } from "../utils/load-calculation";
import type { SystemStat } from "../types/system-stat";
import { getAlertIndicatorIcon } from "./AlertListItem";
import { getSystemUrl } from "../utils/urls";
import { usePreferences } from "../hooks/use-preferences";
import { renderAlertCondition } from "../utils/alerts";
import { renderStatValue } from "../utils/stats";
import type { ContainerStat } from "../types/container-stat";
import { useFormat } from "../hooks/use-format";
import { ContainerMenuBarItem } from "./ContainerMenuBarItem";

export function SystemMenuBarItem({ system }: { system: System }) {
  const preferences = usePreferences();
  const { dateTimeFormat } = useFormat();
  const containers = useListCollection<ContainerStat>("container_stats", {
    filter: `system='${system.id}'&&type='${preferences.observationInterval}'`,
    perPage: preferences.observationIntervalsCount,
    sort: "-updated",
  });
  const stats = useListCollection<SystemStat>("system_stats", {
    filter: `system='${system.id}'&&type='${preferences.observationInterval}'`,
    perPage: preferences.observationIntervalsCount,
    sort: "-updated",
  });
  const alerts = useListCollection<Alert>("alerts", {
    filter: `system='${system.id}'` /* only fetch alerts for current system */,
    sort: "name",
  });

  const handleClick = useCallback(() => {
    open(getSystemUrl(preferences.host, system)).catch(captureException);
  }, [preferences, system]);

  const handleRefresh = useCallback(() => {
    containers.revalidate();
    stats.revalidate();
    alerts.revalidate();
  }, [containers, stats, alerts]);

  const containerIds = containers.data
    .map((entry) => entry.stats.map((containerStat) => containerStat.n))
    .flat()
    .filter((v, i, a) => a.indexOf(v) === i)
    .toSorted();

  const combinedCpuLoadOverTime = useMemo(() => average(stats.data?.map((stat) => stat.stats.cpu)), [stats]);
  const combinedRamLoadOverTime = useMemo(() => average(stats.data?.map((stat) => stat.stats.mp)), [stats]);
  const combinedDiskSpaceOverTime = useMemo(() => average(stats.data?.map((stat) => stat.stats.du)), [stats]);
  const combinedDiskSpacePercentageOverTime = useMemo(() => average(stats.data?.map((stat) => stat.stats.dp)), [stats]);
  const combinedAverageLoadOverTime = useMemo(
    () => average(stats.data?.map((stats) => getAverageSystemLoadPercentage(stats))),
    [stats, system],
  );
  const combinedAverageLoadOverTimeText = renderStatValue(combinedAverageLoadOverTime, "%", 0);

  return (
    <MenuBarExtra.Submenu
      title={`${system.name} ⋅ ${combinedAverageLoadOverTimeText}`}
      icon={getSystemLoadIndicatorIcon(combinedAverageLoadOverTime)}
    >
      <MenuBarExtra.Item
        icon={Icon.Clock}
        title={
          stats.data.length > 0
            ? `Data loaded at ${dateTimeFormat.format(new Date(stats.data[0]?.updated))}`
            : "Unable to load data"
        }
      />
      <MenuBarExtra.Section title="Statistics">
        <MenuBarExtra.Item
          icon={Icon.ComputerChip}
          onAction={handleClick}
          title="CPU Usage"
          subtitle={`⋅ ${renderStatValue(combinedCpuLoadOverTime, "%")}`}
        />
        <MenuBarExtra.Item
          icon={Icon.MemoryChip}
          onAction={handleClick}
          title="RAM Usage"
          subtitle={`⋅ ${renderStatValue(combinedRamLoadOverTime, "%")}`}
        />
        <MenuBarExtra.Item
          icon={Icon.HardDrive}
          onAction={handleClick}
          title="Disk Usage"
          subtitle={`⋅ ${renderStatValue(combinedDiskSpacePercentageOverTime, "%")} (${renderStatValue(combinedDiskSpaceOverTime, "GB")})`}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Alerts">
        {alerts.data.map((alert) => (
          <MenuBarExtra.Item
            key={alert.id}
            title={alert.name}
            onAction={handleClick}
            subtitle={`⋅ ${renderAlertCondition(alert)}`}
            icon={getAlertIndicatorIcon(alert.name, alert.triggered, Color.Red, Color.SecondaryText)}
          />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Containers">
        <MenuBarExtra.Submenu icon={Icon.Box} title={`View ${containerIds.length} Containers`}>
          {containerIds.map((containerId) => (
            <ContainerMenuBarItem
              key={containerId}
              containers={containers.data}
              containerId={containerId}
              system={system}
              onRefresh={containers.revalidate}
            />
          ))}
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          title="Open in Browser"
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={handleClick}
        />
        <MenuBarExtra.Item
          title="Reload"
          icon={Icon.Repeat}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={handleRefresh}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra.Submenu>
  );
}
