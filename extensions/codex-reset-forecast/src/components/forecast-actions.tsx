import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";

export const WEBSITE_URL = "https://www.willcodexquotareset.com/";

type ForecastActionsProps = {
  detail?: Action.Push.Props["target"];
  sourceUrl?: string;
  copyContent: string;
  copyTitle?: string;
  onRefresh: () => void;
};

export function ForecastActions({ detail, sourceUrl, copyContent, copyTitle, onRefresh }: ForecastActionsProps) {
  const refreshAction = (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  );

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {detail ? <Action.Push title="View Details" icon={Icon.Eye} target={detail} /> : refreshAction}
        {sourceUrl ? <Action.OpenInBrowser title="Open Source Post" url={sourceUrl} /> : null}
        <Action.OpenInBrowser title="Open Will Codex Reset?" url={WEBSITE_URL} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title={copyTitle ?? "Copy Forecast Summary"} content={copyContent} />
        {sourceUrl ? <Action.CopyToClipboard title="Copy Source URL" content={sourceUrl} /> : null}
      </ActionPanel.Section>
      {detail ? <ActionPanel.Section>{refreshAction}</ActionPanel.Section> : null}
    </ActionPanel>
  );
}
