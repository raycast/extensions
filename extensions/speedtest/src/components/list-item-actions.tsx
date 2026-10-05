import { Action, ActionPanel } from "@raycast/api";
import { ClearCacheAction, CopySpeedtestResultAction } from "../lib/actions";
import { ClipboardData } from "../lib/speedtest.types";

type ListItemActionsProps = {
  isLoading: boolean;
  url: string;
  sectionClipboard: ClipboardData;
  summary: React.ReactNode;
  restart: React.ReactNode;
  meter: React.ReactNode;
  isDetailedViewEnabled: boolean;
  showViewAction: React.ReactNode;
  hideViewAction: React.ReactNode;
};

export const ListItemActions = ({
  isLoading,
  url,
  sectionClipboard,
  summary,
  restart,
  meter,
  isDetailedViewEnabled,
  showViewAction,
  hideViewAction,
}: ListItemActionsProps) => (
  <ActionPanel>
    <ActionPanel.Section>
      {isDetailedViewEnabled ? hideViewAction : showViewAction}
      {url && <Action.OpenInBrowser title="Open Results in Browser" url={url} />}
      {restart}
      {meter}
    </ActionPanel.Section>
    <ActionPanel.Section>
      {summary}
      {sectionClipboard && <CopySpeedtestResultAction result={sectionClipboard} />}
    </ActionPanel.Section>
    <ActionPanel.Section>
      <ClearCacheAction isLoading={isLoading} />
    </ActionPanel.Section>
  </ActionPanel>
);
