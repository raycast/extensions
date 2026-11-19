import { ActionPanel } from "@raycast/api";
import { OpenMonitorInBrowserAction } from "@/ui/monitors/action-panel/actions/open-monitor-in-browser-action";
import { RefreshAction } from "@/ui/monitors/action-panel/actions/refresh-action";

interface MonitorActionPanelProps {
  webUrl: string;
  onRefresh: () => void;
}

export function MonitorActionPanel({ webUrl, onRefresh }: MonitorActionPanelProps) {
  return (
    <ActionPanel>
      <OpenMonitorInBrowserAction url={webUrl} />
      <RefreshAction onRefresh={onRefresh} />
    </ActionPanel>
  );
}
