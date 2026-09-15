import { Action, ActionPanel, Icon, Keyboard, launchCommand, LaunchType } from "@raycast/api";
import { safeSourceUrl } from "../domain/reset-history";

export const WEBSITE_URL = "https://codexreset.org/";

type ForecastActionsProps = {
  sourceUrl?: string | null;
  copyContent?: string;
  copyTitle?: string;
  onRefresh: () => void;
};

export function ForecastActions({ sourceUrl, copyContent, copyTitle, onRefresh }: ForecastActionsProps) {
  const source = safeSourceUrl(sourceUrl);
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {source ? <Action.OpenInBrowser title="Open Original Source" url={source} /> : null}
        <Action.OpenInBrowser title="Open Codex Reset Monitor" url={WEBSITE_URL} />
        <Action
          title="View Reset Calendar"
          icon={Icon.Calendar}
          onAction={() => launchCommand({ name: "reset-history-calendar", type: LaunchType.UserInitiated })}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        {copyContent ? (
          <Action.CopyToClipboard title={copyTitle ?? "Copy Forecast Summary"} content={copyContent} />
        ) : null}
        {source ? <Action.CopyToClipboard title="Copy Source URL" content={source} /> : null}
        <Action
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={onRefresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
