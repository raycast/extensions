import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useInterval } from "usehooks-ts";
import os from "node:os";

import { Actions } from "../components/Actions";
import { pendingText } from "../components/CompactMetadata";
import { MetadataLabel } from "../components/MetadataLabel";
import { getUptimeLabel } from "../Cpu/CpuUtils";
import { shortCores } from "../lib/cpu-cores";
import { HardwareInfo } from "../lib/hardware-info";
import { OSInfo } from "../lib/os-version";
import { countProcesses } from "../lib/process-list";
import { systemInfoCopyFields } from "../lib/system-info-fields";
import { getHardwareInfo, getOSInfo } from "./SystemUtils";

/** `ps` walks the whole process table; the count moves slowly, so it polls at a gentler cadence than the gauges. */
const LIVE_REFRESH_MS = 5000;

export default function SystemInfo({ isActive = false }: { isActive?: boolean }) {
  // Fetched at the row level so the copy actions and the detail pane share one read.
  const { data, isLoading } = usePromise(async () => {
    const [hardware, osInfo] = await Promise.all([getHardwareInfo(), getOSInfo()]);
    return { hardware, osInfo };
  });
  const hostname = os.hostname().replace(/\.(local|lan)$/, "");

  return (
    <List.Item
      id="system-info"
      title="System Info"
      icon={Icon.Finder}
      detail={
        <SystemInfoDetail
          isActive={isActive}
          isLoading={isLoading}
          hostname={hostname}
          hardware={data?.hardware}
          osInfo={data?.osInfo}
        />
      }
      actions={
        <Actions>
          <ActionPanel.Submenu
            icon={Icon.CopyClipboard}
            title="Copy Info"
            shortcut={Keyboard.Shortcut.Common.Copy}
            isLoading={isLoading}
          >
            {systemInfoCopyFields(hostname, data?.hardware, data?.osInfo).map((field) => (
              <Action.CopyToClipboard key={field.title} title={field.title} content={field.value} />
            ))}
          </ActionPanel.Submenu>
        </Actions>
      }
    />
  );
}

function SystemInfoDetail({
  isActive,
  isLoading,
  hostname,
  hardware,
  osInfo,
}: {
  isActive: boolean;
  isLoading: boolean;
  hostname: string;
  hardware?: HardwareInfo;
  osInfo?: OSInfo;
}) {
  // Live rows poll only while this row is selected, like every other pane. CPU, memory, disk and
  // battery percentages are deliberately absent: the list column beside this pane already shows them.
  const { data: live, revalidate: revalidateLive } = usePromise(
    async () => ({ processCount: await countProcesses(), uptime: getUptimeLabel() }),
    [],
    { execute: isActive },
  );

  useInterval(() => {
    if (isActive) {
      revalidateLive();
    }
  }, LIVE_REFRESH_MS);

  const pending = pendingText(isActive);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={
        <List.Item.Detail.Metadata>
          <MetadataLabel icon={Icon.Clock} title="Uptime" text={live?.uptime ?? pending} />
          <MetadataLabel icon={Icon.List} title="Processes" text={live ? `${live.processCount}` : pending} />
          <List.Item.Detail.Metadata.Separator />
          <MetadataLabel icon={Icon.Desktop} title="macOS" text={osInfo?.display ?? "-"} />
          <MetadataLabel icon={Icon.Globe} title="Hostname" text={hostname} />
          <MetadataLabel
            icon={Icon.Devices}
            title="Model · Year"
            text={hardware ? `${hardware.modelName} · ${hardware.modelYear}` : "-"}
          />
          <MetadataLabel
            icon={Icon.Fingerprint}
            title="Identifier · Number"
            text={hardware ? `${hardware.modelIdentifier} · ${hardware.modelNumber}` : "-"}
          />
          <MetadataLabel
            icon={Icon.ComputerChip}
            title="Chip · CPU Cores"
            text={hardware ? `${hardware.chip} · ${shortCores(hardware.totalCores)}` : "-"}
          />
          <MetadataLabel
            icon={Icon.Monitor}
            title="GPU · Cores"
            text={hardware ? `${hardware.gpuChipset} · ${hardware.gpuCores}` : "-"}
          />
          <MetadataLabel
            icon={Icon.MemoryChip}
            title="Memory"
            text={
              hardware ? (hardware.isUnifiedMemory ? `${hardware.memory} (shared with GPU)` : hardware.memory) : "-"
            }
          />
          {hardware && !hardware.isUnifiedMemory ? (
            <MetadataLabel icon={Icon.MemoryChip} title="GPU Memory" text={hardware.gpuMemory} />
          ) : null}
          <MetadataLabel icon={Icon.Hashtag} title="Serial Number" text={hardware?.serialNumber ?? "-"} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
