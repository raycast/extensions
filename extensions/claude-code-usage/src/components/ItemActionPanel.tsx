import { Action, ActionPanel, Alert, Icon, confirmAlert } from "@raycast/api";
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
  const handleSignOutWithConfirmation = async () => {
    const confirmed = await confirmAlert({
      title: "Sign Out of Claude",
      message:
        "Are you sure you want to sign out? You will need to re-authenticate to view your usage.",
      primaryAction: {
        title: "Sign Out",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (confirmed) {
      await onSignOut();
    }
  };

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
          onAction={handleSignOutWithConfirmation}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
