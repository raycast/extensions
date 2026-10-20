import { useRef, useCallback } from "react";
import {
  Cache,
  MenuBarExtra,
  Icon,
  getPreferenceValues,
  Image,
  LocalStorage,
  showHUD,
  environment,
  LaunchType,
} from "@raycast/api";
import { usePromise, runAppleScript } from "@raycast/utils";
import { useInterval } from "usehooks-ts";

import { formatTemperature } from "./Temperature/TemperatureUtils";
import { formatBytes, openActivityMonitorAppleScript } from "./utils";
import { DiskInterface } from "./Interfaces";
import { loadMenuBarSnapshot, PINNED_STAT_KEY } from "./menubar/load-snapshot";
import { readMenuBarSnapshot } from "./menubar/snapshot-cache";
import { PinnedStat, snapshotValue } from "./menubar/types";

const cache = new Cache();

export default function Command() {
  const { customIconUrl } = getPreferenceValues<Preferences.MenubarSystemMonitor>();
  const { displayModeCpu, displayModeBattery, displayModeDisk, displayModeMemory } =
    getPreferenceValues<ExtensionPreferences>();
  const { cpuMenubarFormat, memoryMenubarFormat, powerMenubarFormat, networkMenubarFormat, diskMenubarFormat } =
    getPreferenceValues<Preferences.MenubarSystemMonitor>();

  const {
    data: loaded,
    isLoading,
    revalidate,
  } = usePromise(
    () =>
      loadMenuBarSnapshot({
        launchType: environment.launchType,
        supportPath: environment.supportPath,
        cache,
      }),
    [],
  );
  const pinnedStat = loaded?.pinnedStat ?? "none";
  const snapshot = loaded?.snapshot ?? readMenuBarSnapshot(cache);
  const data = {
    osInfo: snapshotValue(snapshot?.values.osInfo),
    storage: snapshotValue(snapshot?.values.storage),
    cpuUsage: snapshotValue(snapshot?.values.cpuUsage),
    memory: snapshotValue(snapshot?.values.memory),
    networkUsage: snapshotValue(snapshot?.values.networkUsage),
    batteryData: snapshotValue(snapshot?.values.batteryData),
    temperatureData: snapshotValue(snapshot?.values.temperatureData),
  };

  const togglePin = useCallback(
    async (stat: PinnedStat) => {
      const next = pinnedStat === stat ? "none" : stat;
      await LocalStorage.setItem(PINNED_STAT_KEY, next);
      revalidate();
      if (next === "none") {
        await showHUD("Unpinned from menu bar");
      } else {
        const labels: Record<PinnedStat, string> = {
          cpu: "CPU Usage",
          temperature: "CPU Temperature",
          memory: "Memory Usage",
          battery: "Battery",
          network: "Network Usage",
          storage: "Storage",
          none: "",
        };
        await showHUD(`Pinned ${labels[next]} to menu bar`);
      }
    },
    [pinnedStat, revalidate],
  );

  const pinIcon = (stat: PinnedStat) => (pinnedStat === stat ? { source: Icon.Pin, tintColor: "#007AFF" } : undefined);

  // When the user clicks the menubar icon, the command stays in memory
  // while the menu is open. Poll for live updates only in that case.
  // Background interval launches should finish fast and unload.
  const isUserLaunch = environment.launchType === LaunchType.UserInitiated;
  const isRevalidating = useRef(false);
  useInterval(
    () => {
      if (!isUserLaunch || isLoading || isRevalidating.current) return;
      isRevalidating.current = true;
      revalidate().finally(() => {
        isRevalidating.current = false;
      });
    },
    isUserLaunch ? 2000 : null,
  );

  const formatTags = (
    formatString: string,
    value: string = "",
    total: string = "",
    percent: string = "",
    displayMode: string = "free",
  ): string => {
    return formatString
      .replaceAll("<BR>", `\n`)
      .replaceAll("<MODE>", displayMode === "free" ? "Free" : "Used")
      .replace("<VALUE>", value)
      .replace("<TOTAL>", total)
      .replace("<PERCENT>", percent);
  };

  const getPinnedTitle = (): string | undefined => {
    switch (pinnedStat) {
      case "cpu":
        if (!data?.cpuUsage) return undefined;
        return displayModeCpu === "free" ? `${100 - +data.cpuUsage} %` : `${data.cpuUsage} %`;
      case "temperature":
        if (!data?.temperatureData?.sensorAvailable) return undefined;
        return formatTemperature(data.temperatureData.cpuAverage);
      case "memory":
        if (!data?.memory) return undefined;
        return displayModeMemory === "free"
          ? `${data.memory.freeMemPercentage} %`
          : `${100 - +data.memory.freeMemPercentage} %`;
      case "battery":
        if (!data?.batteryData) return undefined;
        return `${data.batteryData.batteryLevel} %`;
      case "storage": {
        const disk = data?.storage?.[0];
        if (!disk) return undefined;
        const used = parseFloat(disk.usedStorage);
        const total = parseFloat(disk.totalSize);
        if (!total) return undefined;
        const pct = Math.round((used / total) * 100);
        return displayModeDisk === "free" ? `${100 - pct} %` : `${pct} %`;
      }
      case "network":
        if (!data?.networkUsage) return undefined;
        return `↓ ${formatBytes(data.networkUsage.download)}/s`;
      default:
        return undefined;
    }
  };

  return (
    <MenuBarExtra
      icon={{
        source: customIconUrl || "command-icon.png",
        mask: Image.Mask.RoundedRectangle,
        fallback: "command-icon.png",
      }}
      title={getPinnedTitle()}
      tooltip="System Monitor"
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="System Info">
        <MenuBarExtra.Item title="macOS" subtitle={`${data?.osInfo?.release}` || "Loading..."} icon={Icon.Finder} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Storage">
        {data?.storage?.map((disk: DiskInterface, index: number) => (
          <MenuBarExtra.Item
            key={index}
            title={disk.diskName}
            subtitle={
              disk
                ? formatTags(
                    diskMenubarFormat,
                    displayModeDisk === "free" ? disk.totalAvailableStorage : disk.usedStorage,
                    disk.totalSize,
                    "",
                    displayModeDisk,
                  )
                : "Loading…"
            }
            icon={pinIcon("storage") ?? Icon.HardDrive}
            onAction={() => togglePin("storage")}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="CPU">
        <MenuBarExtra.Item
          title="CPU Usage"
          subtitle={
            data?.cpuUsage
              ? formatTags(
                  cpuMenubarFormat,
                  "",
                  "",
                  `${displayModeCpu === "free" ? 100 - +data.cpuUsage : data.cpuUsage}`,
                  displayModeCpu,
                )
              : "Loading..."
          }
          icon={pinIcon("cpu") ?? Icon.Monitor}
          onAction={() => togglePin("cpu")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Temperature">
        <MenuBarExtra.Item
          title="CPU Temperature"
          subtitle={data?.temperatureData?.sensorAvailable ? formatTemperature(data.temperatureData.cpuAverage) : "N/A"}
          icon={pinIcon("temperature") ?? Icon.Temperature}
          onAction={() => togglePin("temperature")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Memory">
        <MenuBarExtra.Item
          title="Memory Usage"
          subtitle={
            data?.memory
              ? displayModeMemory === "free"
                ? formatTags(
                    memoryMenubarFormat,
                    data.memory.freeMem,
                    data.memory.totalMem,
                    data.memory.freeMemPercentage,
                  )
                : formatTags(
                    memoryMenubarFormat,
                    (+data.memory.totalMem - +data.memory.freeMem).toString(),
                    data.memory.totalMem,
                    (100 - +data.memory.freeMemPercentage).toString(),
                  )
              : "Loading…"
          }
          icon={pinIcon("memory") ?? Icon.MemoryChip}
          onAction={() => togglePin("memory")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Network">
        <MenuBarExtra.Item
          title="Network Usage"
          subtitle={
            data?.networkUsage
              ? formatTags(networkMenubarFormat)
                  .replace("<UP>", formatBytes(data.networkUsage.upload))
                  .replace("<DOWN>", formatBytes(data.networkUsage.download))
              : "Loading…"
          }
          icon={pinIcon("network") ?? Icon.Network}
          onAction={() => togglePin("network")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Power">
        <MenuBarExtra.Item
          title="Battery"
          subtitle={
            data?.batteryData
              ? formatTags(
                  powerMenubarFormat,
                  "",
                  "",
                  displayModeBattery === "free"
                    ? data.batteryData.batteryLevel
                    : (100 - +data.batteryData.batteryLevel).toString(),
                )
              : "Loading…"
          }
          icon={pinIcon("battery") ?? Icon.Plug}
          onAction={() => togglePin("battery")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Activity Monitor"
          icon={Icon.Bolt}
          onAction={() => runAppleScript(openActivityMonitorAppleScript())}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
