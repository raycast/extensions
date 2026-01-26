import { List, getPreferenceValues } from "@raycast/api";
import SystemInfo from "./SystemInfo/SystemInfo";
import CpuMonitor from "./Cpu/CpuMonitor";
import MemoryMonitor from "./Memory/MemoryMonitor";
import NetworkMonitor from "./Network/NetworkMonitor";
import PowerMonitor from "./Power/PowerMonitor";

const { defaultView, displayMode } = getPreferenceValues<ExtensionPreferences>();

export default function SystemMonitor() {
  return (
    <List isShowingDetail selectedItemId={defaultView} searchBarPlaceholder={`Display Mode: ${displayMode}`}>
      <SystemInfo />
      <CpuMonitor />
      <MemoryMonitor />
      <PowerMonitor />
      <NetworkMonitor />
    </List>
  );
}
