import { ActionPanel } from "@raycast/api";
import { OpenStatusPageInBrowserAction } from "@/ui/status-pages/action-panel/actions/open-status-page-in-browser-action";
import { CopyStatusPageDetailAsPngAction } from "@/ui/status-pages/action-panel/actions/copy-status-page-detail-as-png-action";
import { RefreshAction } from "@/ui/status-pages/action-panel/actions/refresh-action";

interface StatusPageActionPanelProps {
  url: string;
  onRefresh: () => void;
  onCopyAsPng: () => void;
}

export function StatusPageActionPanel({ url, onRefresh, onCopyAsPng }: StatusPageActionPanelProps) {
  return (
    <ActionPanel>
      <OpenStatusPageInBrowserAction url={url} />
      <CopyStatusPageDetailAsPngAction onCopyAsPng={onCopyAsPng} />
      <RefreshAction onRefresh={onRefresh} />
    </ActionPanel>
  );
}
