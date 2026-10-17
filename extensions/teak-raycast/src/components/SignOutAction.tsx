import { Action, Icon, showToast, Toast } from "@raycast/api";
import { type SignOutResult, signOutTeak } from "../lib/oauth";
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
        let result: SignOutResult;
        try {
          result = await signOutTeak();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not sign out of Teak",
            message: error instanceof Error ? error.message : "Try again.",
          });
          return;
        }
        await showToast({
          style: Toast.Style.Success,
          title:
            result === "local-only"
              ? "Signed out on this Mac"
              : "Signed out of Teak",
          ...(result === "local-only"
            ? { message: "Other installations may still be connected." }
            : {}),
        });
        onSignedOut?.();
      }}
      shortcut={{ key: "x", modifiers: ["cmd", "shift"] }}
      style={Action.Style.Destructive}
      title="Sign Out"
    />
  );
}
