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
import { cpus } from "os";

import { calculateDiskStorage, getOSInfo } from "./SystemInfo/SystemUtils";
import { getMemoryUsage } from "./Memory/MemoryUtils";
import { getNetworkData } from "./Network/NetworkUtils";
import { getBatteryData } from "./Power/PowerUtils";
import { getTemperatureData, formatTemperature } from "./Temperature/TemperatureUtils";

import { formatBytes, isObjectEmpty, openActivityMonitorAppleScript } from "./utils";
import { DiskInterface } from "./Interfaces";

type PinnedStat = "cpu" | "temperature" | "memory" | "battery" | "network" | "storage" | "none";

const PINNED_STAT_KEY = "menubarPinnedStat";
const cache = new Cache();
const CACHE_KEY = "menubar-data";

// CPU usage needs a previous snapshot to compute deltas.
// Module-level so it survives across interval restarts within the same process.
let prevCpuIdle = 0;
let prevCpuTotal = 0;
(() => {
  for (const core of cpus()) {
    const { user, nice, sys, irq, idle } = core.times;
    prevCpuIdle += idle;
    prevCpuTotal += user + nice + sys + irq + idle;
  }
})();

// Network needs previous snapshot for delta calculation
let prevNetProcess: { [key: string]: number[] } = {};

export default function Command() {
  const { customIconUrl } = getPreferenceValues<Preferences.MenubarSystemMonitor>();
  const { displayModeCpu, displayModeBattery, displayModeDisk, displayModeMemory } =
    getPreferenceValues<ExtensionPreferences>();
  const { cpuMenubarFormat, memoryMenubarFormat, powerMenubarFormat, networkMenubarFormat, diskMenubarFormat } =
    getPreferenceValues<Preferences.MenubarSystemMonitor>();

  const { data: pinnedStat, revalidate: revalidatePinned } = usePromise(async () => {
    const value = await LocalStorage.getItem<string>(PINNED_STAT_KEY);
    return (value as PinnedStat) ?? "none";
  });

  const togglePin = useCallback(
    async (stat: PinnedStat) => {
      const next = pinnedStat === stat ? "none" : stat;
      await LocalStorage.setItem(PINNED_STAT_KEY, next);
      revalidatePinned();
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
    [pinnedStat, revalidatePinned],
  );

  const pinIcon = (stat: PinnedStat) => (pinnedStat === stat ? { source: Icon.Pin, tintColor: "#007AFF" } : undefined);

  // Restore previous data from disk cache so the menubar title doesn't
  // flicker to empty between interval restarts.
  const cached = (() => {
    try {
      const raw = cache.get(CACHE_KEY);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  })();

  // Fetch all data in parallel. Raycast menu-bar commands are short-lived:
  // they load, render, and unload once isLoading becomes false.
  // Raycast's "interval": "10s" in package.json re-launches the command
  // every 10 seconds for background updates — no in-process polling needed.
  const {
    data: freshData,
    isLoading,
    revalidate,
  } = usePromise(async () => {
    const [osInfo, storage, memoryUsage, networkData, batteryData, temperatureData] = await Promise.all([
      getOSInfo(),
      calculateDiskStorage(),
      getMemoryUsage(),
      getNetworkData(),
      getBatteryData(),
      getTemperatureData(),
    ]);

    // CPU usage from os.cpus() delta
    let idle = 0;
    let total = 0;
    for (const core of cpus()) {
      const { user, nice, sys, irq, idle: coreIdle } = core.times;
      idle += coreIdle;
      total += user + nice + sys + irq + coreIdle;
    }
    const dIdle = idle - prevCpuIdle;
    const dTotal = total - prevCpuTotal;
    prevCpuIdle = idle;
    prevCpuTotal = total;
    const cpuUsage = dTotal === 0 ? "0" : Math.round((1 - dIdle / dTotal) * 100).toString();

    // Memory
    const memTotal = memoryUsage.memTotal;
    const memUsed = memoryUsage.memUsed;
    const freeMem = memTotal - memUsed;
    const memory = {
      totalMem: Math.round(memTotal / 1024).toString(),
      freeMemPercentage: Math.round((freeMem * 100) / memTotal).toString(),
      freeMem: Math.round(freeMem / 1024).toString(),
    };

    // Battery
    const isOnAC = !batteryData.isCharging && batteryData.fullyCharged;

    // Network delta
    let upload = 0;
    let download = 0;
    if (!isObjectEmpty(prevNetProcess)) {
      for (const key in networkData) {
        let down = networkData[key][0] - (key in prevNetProcess ? prevNetProcess[key][0] : 0);
        if (down < 0) down = 0;
        let up = networkData[key][1] - (key in prevNetProcess ? prevNetProcess[key][1] : 0);
        if (up < 0) up = 0;
        download += down;
        upload += up;
      }
    }
    prevNetProcess = networkData;

    return {
      osInfo,
      storage,
      cpuUsage,
      memory,
      networkUsage: { upload, download },
      batteryData,
      isOnAC,
      temperatureData,
    };
  }, []);

  const data = freshData ?? cached;

  // Persist to disk cache so next interval restart has instant data
  if (freshData) {
    try {
      cache.set(CACHE_KEY, JSON.stringify(freshData));
    } catch {
      /* ignore */
    }
  }

  // When the user clicks the menubar icon, the command stays in memory
  // while the menu is open. Poll for live updates only in that case.
  // Background interval launches should finish fast and unload.
  const isUserLaunch = environment.launchType === LaunchType.UserInitiated;
  const isRevalidating = useRef(false);
  useInterval(
    () => {
      if (!isUserLaunch || isRevalidating.current) return;
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
