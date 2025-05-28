import { Action, ActionPanel } from "@raycast/api";
import { ClearCacheAction, CopySpeedtestResultAction } from "../lib/actions";
import { ClipboardData } from "../lib/speedtest.types";

type ListItemActionsProps = {
  isLoading: boolean;
  url: string;
  sectionClipboard: ClipboardData;
  summary: JSX.Element;
  restart: JSX.Element;
  isDetailedViewEnabled: boolean;
  showViewAction: JSX.Element;
  hideViewAction: JSX.Element;
};

export const ListItemActions = ({
  isLoading,
  url,
  sectionClipboard,
  summary,
  restart,
  isDetailedViewEnabled,
  showViewAction,
  hideViewAction,
}: ListItemActionsProps) => (
  <ActionPanel>
    <ActionPanel.Section>
      {isDetailedViewEnabled ? hideViewAction : showViewAction}
      {url && <Action.OpenInBrowser title="Open Results in Browser" url={url} />}
      {restart}
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
