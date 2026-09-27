import { List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import SystemInfo from "./SystemInfo/SystemInfo";
import CpuMonitor from "./Cpu/CpuMonitor";
import MemoryMonitor from "./Memory/MemoryMonitor";
import NetworkMonitor from "./Network/NetworkMonitor";
import PowerMonitor from "./Power/PowerMonitor";
import DiskMonitor from "./Disk/DiskMonitor";
import AIUsageMonitor from "./AIUsage/AIUsageMonitor";

const { defaultView, showCodexUsage, showClaudeUsage } = getPreferenceValues<ExtensionPreferences>();
const showAIUsage = showCodexUsage || showClaudeUsage;

export default function SystemMonitor() {
  const initialView = defaultView === "ai-usage" && !showAIUsage ? "system-info" : defaultView;
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(initialView);

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
      {showAIUsage ? <AIUsageMonitor isActive={selectedItemId === "ai-usage"} /> : null}
    </List>
  );
}
