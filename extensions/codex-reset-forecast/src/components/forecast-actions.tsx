import { Action, ActionPanel, Icon } from "@raycast/api";

export const WEBSITE_URL = "https://www.willcodexquotareset.com/";

type ForecastActionsProps = {
  detail?: Action.Push.Props["target"];
  sourceUrl?: string;
  copyContent: string;
  copyTitle?: string;
  onRefresh?: () => void;
};

export function ForecastActions({ detail, sourceUrl, copyContent, copyTitle, onRefresh }: ForecastActionsProps) {
  const refreshAction = onRefresh ? <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} /> : null;
  const sourceAction = sourceUrl ? (
    <Action.OpenInBrowser title="Open Source Post" url={sourceUrl} />
  ) : (
    <Action.OpenInBrowser title="Open Will Codex Reset?" url={WEBSITE_URL} />
  );

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {detail ? <Action.Push title="View Details" icon={Icon.Eye} target={detail} /> : sourceAction}
        {detail && sourceUrl ? sourceAction : null}
        {detail || sourceUrl ? <Action.OpenInBrowser title="Open Will Codex Reset?" url={WEBSITE_URL} /> : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard title={copyTitle ?? "Copy Forecast Summary"} content={copyContent} />
        {sourceUrl ? <Action.CopyToClipboard title="Copy Source URL" content={sourceUrl} /> : null}
      </ActionPanel.Section>
      {refreshAction ? <ActionPanel.Section>{refreshAction}</ActionPanel.Section> : null}
    </ActionPanel>
  );
}
