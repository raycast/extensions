import { Action, ActionPanel, Alert, Icon, Toast, confirmAlert, popToRoot, showToast } from "@raycast/api";
import { signOut } from "../oauth/client";
import { track } from "../lib/telemetry";

/** "Open in Web App" — deep-links to the web app and records opt-in telemetry. */
export function OpenInWebAppAction(props: { url: string; entityType: string; title?: string }) {
  return (
    <Action.OpenInBrowser
      title={props.title ?? "Open in Web App"}
      icon={Icon.Globe}
      url={props.url}
      // Raycast auto-assigns ⌘↵ to the second primary-section action; no explicit
      // shortcut here (⌘↵ is a reserved shortcut and would be flagged/ignored).
      onOpen={() => track({ name: "open_in_web_app", entity_type: props.entityType })}
    />
  );
}

/** Destructive "Sign Out" — confirms, clears local tokens, and pops to root. */
export function SignOutAction() {
  async function handleSignOut() {
    const confirmed = await confirmAlert({
      title: "Sign Out of Expiration Reminder?",
      message: "This clears your tokens from this device. The server-side session remains valid until it expires.",
      icon: Icon.Logout,
      primaryAction: { title: "Sign Out", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await signOut();
    track({ name: "signed_out" });
    await showToast({ style: Toast.Style.Success, title: "Signed out" });
    await popToRoot({ clearSearchBar: true });
  }

  return (
    <Action
      title="Sign out"
      style={Action.Style.Destructive}
      icon={Icon.Logout}
      shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
      onAction={handleSignOut}
    />
  );
}

/**
 * Shared trailing section for every command's ActionPanel: Sign Out plus any
 * extra actions (e.g. a "Reconnect" flow). Kept in one place so behavior stays
 * consistent across all commands (PRD §6.11).
 */
export function AccountActions() {
  return (
    <ActionPanel.Section title="Account">
      <SignOutAction />
    </ActionPanel.Section>
  );
}
