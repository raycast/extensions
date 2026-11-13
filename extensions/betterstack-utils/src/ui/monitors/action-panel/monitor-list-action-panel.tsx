import { ActionPanel } from "@raycast/api";
import { Monitor } from "@/domain/monitor";
import { ViewMonitorDetailAction } from "@/ui/monitors/action-panel/actions/view-monitor-detail-action";
import { OpenMonitorInBrowserAction } from "@/ui/monitors/action-panel/actions/open-monitor-in-browser-action";
import { RefreshAction } from "@/ui/monitors/action-panel/actions/refresh-action";

interface MonitorListActionPanelProps {
  monitor: Monitor & { webUrl: string };
  onRefresh: () => void;
}

export function MonitorListActionPanel({ monitor, onRefresh }: MonitorListActionPanelProps) {
  return (
    <ActionPanel>
      <ViewMonitorDetailAction monitor={monitor} />
      <OpenMonitorInBrowserAction url={monitor.webUrl} />
      <RefreshAction onRefresh={onRefresh} />
    </ActionPanel>
  );
}
