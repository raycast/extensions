import { List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import SystemInfo from "./SystemInfo/SystemInfo";
import CpuMonitor from "./Cpu/CpuMonitor";
import MemoryMonitor from "./Memory/MemoryMonitor";
import NetworkMonitor from "./Network/NetworkMonitor";
import PowerMonitor from "./Power/PowerMonitor";
import DiskVolumes, { BOOT_VOLUME_ITEM_ID } from "./Disk/DiskMonitor";

const { defaultView } = getPreferenceValues<ExtensionPreferences>();

/** The "Disk" preference predates per-volume rows; it now opens on the boot volume. */
const initialItemId = defaultView === "disk" ? BOOT_VOLUME_ITEM_ID : defaultView;

export default function SystemMonitor() {
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(initialItemId);

  return (
    <List
      isShowingDetail
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      searchBarPlaceholder="Switch view…"
    >
      <List.Section title="Overview">
        <SystemInfo isActive={selectedItemId === "system-info"} />
      </List.Section>
      <List.Section title="CPU">
        <CpuMonitor isActive={selectedItemId === "cpu"} />
      </List.Section>
      <List.Section title="Memory">
        <MemoryMonitor isActive={selectedItemId === "memory"} />
      </List.Section>
      <List.Section title="Disk">
        <DiskVolumes selectedItemId={selectedItemId} />
      </List.Section>
      <List.Section title="Power">
        <PowerMonitor isActive={selectedItemId === "power"} />
      </List.Section>
      <List.Section title="Network">
        <NetworkMonitor isActive={selectedItemId === "network"} />
      </List.Section>
    </List>
  );
}
