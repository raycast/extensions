import { captureException, MenuBarExtra, open } from "@raycast/api";
import { useCallback, useMemo } from "react";

import type { System } from "../types/system";
import { getSystemUrl } from "../utils/urls";
import { usePreferences } from "../hooks/use-preferences";
import type { ContainerStat } from "../types/container-stat";
import { getSystemLoadIndicatorIcon } from "../utils/icons";
import { average } from "../utils/load-calculation";
import { renderStatValue } from "../utils/stats";
import { truncateText } from "../utils/truncate";

export interface ContainerMenuBarItemProps {
  system: System;
  containers: ContainerStat[];
  containerId: string;
  onRefresh: () => void;
}

export function ContainerMenuBarItem({ system, containerId, containers }: ContainerMenuBarItemProps) {
  const preferences = usePreferences();

  const containerStats = useMemo(
    () => containers.flatMap((v) => v.stats.filter((stat) => stat.n === containerId)),
    [containers, containerId],
  );

  const averageCpuLoad = average(containerStats.map((cs) => cs.c));
  const averageMemoryUsed = average(containerStats.map((cs) => cs.m));

  const handleClick = useCallback(() => {
    open(getSystemUrl(preferences.host, system)).catch(captureException);
  }, [preferences, system]);

  return (
    <MenuBarExtra.Item
      onAction={handleClick}
      title={truncateText(containerId, 28, "mid")}
      subtitle={`⋅ ${renderStatValue(averageMemoryUsed, "MB", 0)}`}
      icon={getSystemLoadIndicatorIcon(averageCpuLoad < 1 ? 1 : averageCpuLoad)}
    />
  );
}
