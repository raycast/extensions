import { Action, Icon, showToast, Toast } from "@raycast/api";
import { teakOAuth } from "../lib/oauth";
import { getPreferences } from "../lib/preferences";

interface SignOutActionProps {
  onSignedOut?: () => void;
}

export function SignOutAction({ onSignedOut }: SignOutActionProps) {
  // Sign-out only applies to browser (OAuth) sessions. API-key users manage
  // their credential in extension preferences, so hide the action for them.
  if (getPreferences().apiKey?.trim()) {
    return null;
  }

  return (
    <Action
      icon={Icon.Logout}
      onAction={async () => {
        await teakOAuth.client.removeTokens();
        await showToast({
          style: Toast.Style.Success,
          title: "Signed out of Teak",
        });
        onSignedOut?.();
      }}
      shortcut={{ key: "x", modifiers: ["cmd", "shift"] }}
      style={Action.Style.Destructive}
      title="Sign Out"
    />
  );
}
