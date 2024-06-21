import { Action, ActionPanel } from "@raycast/api";
import { ClearCacheAction, CopySpeedtestResultAction } from "../lib/actions";
import { ClipboardData } from "../lib/speedtest.types";

type ListItemActionsProps = {
  isLoading: boolean;
  url: string;
  sectionClipboard: ClipboardData;
  summary: JSX.Element;
  restart: JSX.Element;
  toggleViewAction: JSX.Element;
};

export const ListItemActions = ({
  toggleViewAction,
  sectionClipboard,
  url,
  restart,
  summary,
  isLoading,
}: ListItemActionsProps) => (
  <ActionPanel>
    <ActionPanel.Section>{toggleViewAction}</ActionPanel.Section>
    <ActionPanel.Section>
      {summary}
      {sectionClipboard && <CopySpeedtestResultAction result={sectionClipboard} />}
    </ActionPanel.Section>
    <ActionPanel.Section>
      {url && (
        <Action.OpenInBrowser
          title="Open Results in Browser"
          url={url}
          shortcut={{ modifiers: ["opt"], key: "enter" }}
        />
      )}
      {restart}
    </ActionPanel.Section>
    <ActionPanel.Section>
      <ClearCacheAction isLoading={isLoading} />
    </ActionPanel.Section>
  </ActionPanel>
);
