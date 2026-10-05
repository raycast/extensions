import { List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import SystemInfo from "./SystemInfo/SystemInfo";
import CpuMonitor from "./Cpu/CpuMonitor";
import MemoryMonitor from "./Memory/MemoryMonitor";
import NetworkMonitor from "./Network/NetworkMonitor";
import PowerMonitor from "./Power/PowerMonitor";
import DiskMonitor from "./Disk/DiskMonitor";

const { defaultView } = getPreferenceValues<ExtensionPreferences>();

export default function SystemMonitor() {
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(defaultView);

  return (
    <List
      isShowingDetail
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      searchBarPlaceholder="Switch view…"
    >
      <SystemInfo />
      <CpuMonitor isActive={selectedItemId === "cpu"} />
      <MemoryMonitor isActive={selectedItemId === "memory"} />
      <DiskMonitor isActive={selectedItemId === "disk"} />
      <PowerMonitor isActive={selectedItemId === "power"} />
      <NetworkMonitor isActive={selectedItemId === "network"} />
    </List>
  );
}
