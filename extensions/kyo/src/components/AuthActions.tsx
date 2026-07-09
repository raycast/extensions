import { Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { logout } from "../api/oauth";

/** Shared "Log Out of Kyo" action, safe to drop into any command's ActionPanel. */
export function LogOutAction() {
  return (
    <Action
      title="Log out of Kyo"
      icon={Icon.Logout}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
      onAction={async () => {
        await logout();
        await showToast({
          style: Toast.Style.Success,
          title: "Logged out of Kyo",
        });
      }}
    />
  );
}

/** Convenience panel section wrapper. */
export function AuthSection() {
  return (
    <ActionPanel.Section title="Account">
      <LogOutAction />
    </ActionPanel.Section>
  );
}
