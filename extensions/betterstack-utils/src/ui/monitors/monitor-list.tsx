import { getPreferenceValues, List } from "@raycast/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMonitors } from "@/hooks/use-monitors";
import { useMonitorStatusIcons } from "@/ui/monitors/use-monitor-status-icons";
import { MonitorListItem } from "@/ui/monitors/components/monitor-list-item";
import { prerenderMonitorDetailImages } from "@/ui/monitors/monitor-detail-renderer";

const queryClient = new QueryClient();

function Monitors() {
  const { teamId } = getPreferenceValues<Preferences>();
  const { monitors, isLoading, refresh } = useMonitors({ teamId });
  const icons = useMonitorStatusIcons();

  // Warms the detail images of the selected monitor so its detail page opens without waiting.
  const prerenderSelectedMonitor = (monitorId: string | null) => {
    const selectedMonitor = monitors.find((monitor) => monitor.id === monitorId);
    if (selectedMonitor) void prerenderMonitorDetailImages(selectedMonitor);
  };

  return (
    <List isLoading={isLoading} onSelectionChange={prerenderSelectedMonitor}>
      {monitors.map((monitor) => (
        <MonitorListItem key={monitor.id} monitor={monitor} icon={icons[monitor.status]} onRefresh={refresh} />
      ))}
    </List>
  );
}

export function MonitorList() {
  return (
    <QueryClientProvider client={queryClient}>
      <Monitors />
    </QueryClientProvider>
  );
}
