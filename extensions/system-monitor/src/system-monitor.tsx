import { List, getPreferenceValues } from "@raycast/api";
import CpuMonitor from "./Cpu/CpuMonitor";
import MemoryMonitor from "./Memory/MemoryMonitor";
import NetworkMonitor from "./Network/NetworkMonitor";
import PowerMonitor from "./Power/PowerMonitor";

export default function SystemMonitor() {
  const render = () => {
    const defaultView = getPreferenceValues<ExtensionPreferences>().defaultview;

    return (
      <List isShowingDetail selectedItemId={defaultView}>
        <CpuMonitor />
        <MemoryMonitor />
        <PowerMonitor />
        <NetworkMonitor />
      </List>
    );
  };

  return <>{render()}</>;
}
