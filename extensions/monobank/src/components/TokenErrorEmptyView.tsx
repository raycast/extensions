import { Action, ActionPanel, Icon, List, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { TokenError } from "../api/monobank";

export function showInvalidTokenToast() {
  return showToast({
    style: Toast.Style.Failure,
    title: "Invalid access token",
    message: "Check the token in the extension preferences",
    primaryAction: {
      title: "Open Extension Preferences",
      onAction: () => openExtensionPreferences(),
    },
  });
}

/** Explains a missing or rejected token, with a shortcut to the preferences. `purpose` is e.g. "see your accounts". */
export default function TokenErrorEmptyView(props: { tokenError: TokenError; purpose: string }) {
  const { tokenError, purpose } = props;

  return (
    <List.EmptyView
      icon={Icon.Key}
      title={tokenError === "missing" ? "Access Token Required" : "Invalid Access Token"}
      description={
        tokenError === "missing"
          ? `Add your monobank access token in the extension preferences to ${purpose}`
          : "Update your monobank access token in the extension preferences"
      }
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
