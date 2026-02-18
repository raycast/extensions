import { List, getPreferenceValues } from "@raycast/api";
import SystemInfo from "./SystemInfo/SystemInfo";
import CpuMonitor from "./Cpu/CpuMonitor";
import MemoryMonitor from "./Memory/MemoryMonitor";
import NetworkMonitor from "./Network/NetworkMonitor";
import PowerMonitor from "./Power/PowerMonitor";
import TemperatureMonitor from "./Temperature/TemperatureMonitor";

const { defaultView } = getPreferenceValues<ExtensionPreferences>();

export default function SystemMonitor() {
  return (
    <List isShowingDetail selectedItemId={defaultView} searchBarPlaceholder={`Search:`}>
      <SystemInfo />
      <CpuMonitor />
      <TemperatureMonitor />
      <MemoryMonitor />
      <PowerMonitor />
      <NetworkMonitor />
    </List>
  );
}
