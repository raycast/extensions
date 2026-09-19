import { Action, ActionPanel, Icon } from "@raycast/api";
import { SETTINGS_URL } from "../utils/constants";

type ItemActionPanelProps = {
  refresh: () => Promise<unknown>;
  onSignOut: () => Promise<void>;
  copyContent?: string;
};

export function ItemActionPanel({
  refresh,
  onSignOut,
  copyContent,
}: ItemActionPanelProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser
          icon={Icon.Globe}
          title="Open Usage Settings"
          url={SETTINGS_URL}
        />
        {copyContent ? (
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Usage Summary"
            content={copyContent}
          />
        ) : null}
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Refresh Usage"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={refresh}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        <Action
          title="Sign Out…"
          icon={Icon.Logout}
          style={Action.Style.Destructive}
          onAction={onSignOut}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
