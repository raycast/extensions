import { useRef, useCallback } from "react";
import { MenuBarExtra, Icon, getPreferenceValues, Image, LocalStorage, showHUD } from "@raycast/api";
import { usePromise, runAppleScript } from "@raycast/utils";
import { useInterval } from "usehooks-ts";

import { cpuUsage as osCpuUsage } from "os-utils";
import { calculateDiskStorage, getOSInfo } from "./SystemInfo/SystemUtils";
import { getMemoryUsage } from "./Memory/MemoryUtils";
import { getNetworkData } from "./Network/NetworkUtils";
import { getBatteryData } from "./Power/PowerUtils";
import { getTemperatureData, formatTemperature } from "./Temperature/TemperatureUtils";

import { formatBytes, isObjectEmpty, openActivityMonitorAppleScript } from "./utils";

type PinnedStat = "cpu" | "temperature" | "memory" | "battery" | "network" | "storage" | "none";

const PINNED_STAT_KEY = "menubarPinnedStat";

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

  const {
    data: systemInfo,
    revalidate: revalidateSystem,
    isLoading,
  } = usePromise(async () => {
    const osInfo = await getOSInfo();
    const storage = await calculateDiskStorage();

    return { osInfo, storage };
  });

  const { data: cpuUsage, revalidate: revalidateCpu } = usePromise(() => {
    return new Promise((resolve) => {
      osCpuUsage((v) => {
        resolve(Math.round(v * 100).toString());
      });
    });
  });

  const { data: memoryUsage, revalidate: revalidateMemory } = usePromise(async () => {
    const memoryUsage = await getMemoryUsage();
    const memTotal = memoryUsage.memTotal;
    const memUsed = memoryUsage.memUsed;
    const freeMem = memTotal - memUsed;

    return {
      totalMem: Math.round(memTotal / 1024).toString(),
      freeMemPercentage: Math.round((freeMem * 100) / memTotal).toString(),
      freeMem: Math.round(freeMem / 1024).toString(),
    };
  });

  const prevProcess = useRef<{ [key: string]: number[] }>({});
  const { data: networkUsage, revalidate: revalidateNetwork } = usePromise(async () => {
    const currProcess = await getNetworkData();
    let upload = 0;
    let download = 0;

    if (!isObjectEmpty(prevProcess.current)) {
      for (const key in currProcess) {
        let down = currProcess[key][0] - (key in prevProcess.current ? prevProcess.current[key][0] : 0);

        if (down < 0) {
          down = 0;
        }

        let up = currProcess[key][1] - (key in prevProcess.current ? prevProcess.current[key][1] : 0);

        if (up < 0) {
          up = 0;
        }

        download += down;
        upload += up;
      }
    }

    prevProcess.current = currProcess;

    return {
      upload,
      download,
    };
  });

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

  const { data: batteryData, revalidate: revalidateBattery } = usePromise(async () => {
    const batteryData = await getBatteryData();
    const isOnAC = !batteryData.isCharging && batteryData.fullyCharged;

    return {
      batteryData,
      isOnAC,
    };
  });

  const { data: temperatureData, revalidate: revalidateTemperature } = usePromise(getTemperatureData);

  useInterval(() => {
    revalidateSystem();
    revalidateCpu();
    revalidateMemory();
    revalidateNetwork();
    revalidateBattery();
  }, 1000);

  // Temperature reads from an external binary (IOKit HID sensors) which is
  // slower than the in-process stats above. Polling it on its own 3s interval
  // prevents revalidation calls from stacking up and producing stale readings.
  useInterval(revalidateTemperature, 3000);

  const getPinnedTitle = (): string | undefined => {
    switch (pinnedStat) {
      case "cpu":
        if (!cpuUsage) return undefined;
        return displayModeCpu === "free" ? `${100 - +cpuUsage} %` : `${cpuUsage} %`;
      case "temperature":
        if (!temperatureData?.sensorAvailable) return undefined;
        return formatTemperature(temperatureData.cpuAverage);
      case "memory":
        if (!memoryUsage) return undefined;
        return displayModeMemory === "free"
          ? `${memoryUsage.freeMemPercentage} %`
          : `${100 - +memoryUsage.freeMemPercentage} %`;
      case "battery":
        if (!batteryData) return undefined;
        return `${batteryData.batteryData.batteryLevel} %`;
      case "storage": {
        const disk = systemInfo?.storage?.[0];
        if (!disk) return undefined;
        const used = parseFloat(disk.usedStorage);
        const total = parseFloat(disk.totalSize);
        if (!total) return undefined;
        const pct = Math.round((used / total) * 100);
        return displayModeDisk === "free" ? `${100 - pct} %` : `${pct} %`;
      }
      case "network":
        if (!networkUsage) return undefined;
        return `↓ ${formatBytes(networkUsage.download)}/s`;
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
        <MenuBarExtra.Item
          title="macOS"
          subtitle={`${systemInfo?.osInfo.release}` || "Loading..."}
          icon={Icon.Finder}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Storage">
        {systemInfo?.storage.map((disk, index) => (
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
            cpuUsage
              ? formatTags(
                  cpuMenubarFormat,
                  "",
                  "",
                  `${displayModeCpu === "free" ? 100 - +cpuUsage : cpuUsage}`,
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
          subtitle={temperatureData?.sensorAvailable ? formatTemperature(temperatureData.cpuAverage) : "N/A"}
          icon={pinIcon("temperature") ?? Icon.Temperature}
          onAction={() => togglePin("temperature")}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Memory">
        <MenuBarExtra.Item
          title="Memory Usage"
          subtitle={
            memoryUsage
              ? displayModeMemory === "free"
                ? formatTags(
                    memoryMenubarFormat,
                    memoryUsage.freeMem,
                    memoryUsage.totalMem,
                    memoryUsage.freeMemPercentage,
                  )
                : formatTags(
                    memoryMenubarFormat,
                    (+memoryUsage.totalMem - +memoryUsage.freeMem).toString(),
                    memoryUsage.totalMem,
                    (100 - +memoryUsage.freeMemPercentage).toString(),
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
            networkUsage
              ? formatTags(networkMenubarFormat)
                  .replace("<UP>", formatBytes(networkUsage.upload))
                  .replace("<DOWN>", formatBytes(networkUsage.download))
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
            batteryData
              ? formatTags(
                  powerMenubarFormat,
                  "",
                  "",
                  displayModeBattery === "free"
                    ? batteryData.batteryData.batteryLevel
                    : (100 - +batteryData.batteryData.batteryLevel).toString(),
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
