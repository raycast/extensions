import { useRef } from "react";
import { MenuBarExtra, Icon, getPreferenceValues, Image } from "@raycast/api";
import { usePromise, runAppleScript } from "@raycast/utils";
import { useInterval } from "usehooks-ts";

import { cpuUsage as osCpuUsage } from "os-utils";
import { openActivityMonitorAppleScript } from "./utils";
import { calculateDiskStorage, getOSInfo } from "./SystemInfo/SystemUtils";
import { getMemoryUsage } from "./Memory/MemoryUtils";
import { getNetworkData } from "./Network/NetworkUtils";
import { getBatteryData } from "./Power/PowerUtils";

import { formatBytes, isObjectEmpty } from "./utils";

export default function Command() {
  const { customIconUrl } = getPreferenceValues();

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

  const { data: batteryData, revalidate: revalidateBattery } = usePromise(async () => {
    const batteryData = await getBatteryData();
    const isOnAC = !batteryData.isCharging && batteryData.fullyCharged;

    return {
      batteryData,
      isOnAC,
    };
  });

  useInterval(() => {
    revalidateSystem();
    revalidateCpu();
    revalidateMemory();
    revalidateNetwork();
    revalidateBattery();
  }, 1000);

  return (
    <MenuBarExtra
      icon={{
        source: customIconUrl || "command-icon.png",
        mask: Image.Mask.RoundedRectangle,
        fallback: "command-icon.png",
      }}
      tooltip="System Monitor"
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="System Info">
        <MenuBarExtra.Item
          title="macOS"
          subtitle={`${systemInfo?.osInfo.release}` || "Loading..."}
          icon={Icon.Finder}
          onAction={() => runAppleScript(openActivityMonitorAppleScript())}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Storage">
        {systemInfo?.storage.map((disk, index) => (
          <MenuBarExtra.Item
            key={index}
            title={disk.diskName}
            subtitle={`${disk.totalAvailableStorage} GB available of ${disk.totalSize} GB` || "Loading..."}
            icon={Icon.HardDrive}
            onAction={() => runAppleScript(openActivityMonitorAppleScript(4))}
          />
        ))}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="CPU">
        <MenuBarExtra.Item
          title="CPU Usage"
          subtitle={cpuUsage ? `${cpuUsage} %` : "Loading..."}
          icon={Icon.Monitor}
          onAction={() => runAppleScript(openActivityMonitorAppleScript(1))}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Memory">
        <MenuBarExtra.Item
          title="Memory Usage"
          subtitle={`${memoryUsage?.freeMemPercentage} % (~ ${memoryUsage?.freeMem} GB)` || "Loading..."}
          icon={Icon.MemoryChip}
          onAction={() => runAppleScript(openActivityMonitorAppleScript(2))}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Network">
        <MenuBarExtra.Item
          title="Network Usage"
          subtitle={
            `↓ ${networkUsage?.download !== undefined ? formatBytes(networkUsage.download) : "0 B"}/s ↑ ${
              networkUsage?.upload !== undefined ? formatBytes(networkUsage.upload) : "0 B"
            }/s` || "Loading..."
          }
          icon={Icon.Network}
          onAction={() => runAppleScript(openActivityMonitorAppleScript(5))}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Power">
        <MenuBarExtra.Item
          title="Battery"
          subtitle={batteryData?.batteryData ? `${batteryData?.batteryData?.batteryLevel} %` : "Loading..."}
          icon={Icon.Plug}
          onAction={() => runAppleScript(openActivityMonitorAppleScript(3))}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
