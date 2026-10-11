import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  Toast,
  confirmAlert,
  showHUD,
  showToast,
} from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useEffect, useState } from "react";
import { deleteCurrentAccountCalendarSettings } from "./lib/calendar-settings";
import { googleOAuth } from "./lib/google-oauth";
import { invalidateMenuBarSession } from "./lib/menu-bar-session";

type DisconnectMode = "keep" | "delete";

async function confirmDisconnect(mode: DisconnectMode): Promise<boolean> {
  if (mode === "keep") {
    return confirmAlert({
      title: "Disconnect Google Calendar?",
      message:
        "DayCal will sign out of this Google account on this Mac. Your saved calendar selections, role mappings, routing keywords, and setup state will be kept for this account. This does not revoke DayCal in your Google Account.",
      primaryAction: {
        title: "Disconnect & Keep Settings",
        style: Alert.ActionStyle.Destructive,
      },
    });
  }

  return confirmAlert({
    title: "Disconnect and delete DayCal settings?",
    message:
      "DayCal will sign out and delete the locally saved calendar setup for this Google account, including calendar selections, role mappings, routing keywords, and setup state. Your Google Calendar events will not be deleted. Extension-wide Raycast preferences are unchanged, and this does not revoke DayCal in your Google Account.",
    primaryAction: {
      title: "Disconnect & Delete Settings",
      style: Alert.ActionStyle.Destructive,
    },
  });
}

export async function disconnectGoogle(mode: DisconnectMode): Promise<boolean> {
  const tokens = await googleOAuth.client.getTokens();

  if (!tokens?.accessToken) {
    await invalidateMenuBarSession();
    await showHUD("Google Calendar is already disconnected");
    return false;
  }

  if (!(await confirmDisconnect(mode))) return false;

  try {
    // Account-scoped setup must be removed while the Google connection still
    // exists because its durable local storage scope is resolved from the
    // connected account's primary calendar. OAuth tokens are removed only
    // after that cleanup succeeds.
    if (mode === "delete") {
      await deleteCurrentAccountCalendarSettings();
    }

    await googleOAuth.client.removeTokens();
    await invalidateMenuBarSession();

    await showHUD(
      mode === "delete"
        ? "🔒 Google Calendar disconnected · DayCal settings deleted"
        : "🔒 Google Calendar disconnected · settings kept",
    );
    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not disconnect Google Calendar",
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function ConnectedDisconnectCommand() {
  return (
    <List searchBarPlaceholder="Choose what DayCal should keep…">
      <List.Section title="Disconnect Google Calendar">
        <List.Item
          icon={Icon.Lock}
          title="Keep DayCal Settings"
          subtitle="Disconnect Google but keep this account's calendar setup for a future reconnect"
          actions={
            <ActionPanel>
              <Action
                title="Disconnect & Keep Settings"
                icon={Icon.Lock}
                onAction={() => disconnectGoogle("keep")}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Trash}
          title="Delete DayCal Settings"
          subtitle="Disconnect Google and make this account start fresh the next time it connects"
          actions={
            <ActionPanel>
              <Action
                title="Disconnect & Delete Settings"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => disconnectGoogle("delete")}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// Only mount the OAuth wrapper after we know that tokens already exist. This
// gives deleteCurrentAccountCalendarSettings() the authenticated context needed
// by getAccessToken(), without turning the disconnect command into a sign-in
// command when the user is already disconnected.
const AuthenticatedDisconnectCommand = withAccessToken(googleOAuth)(
  ConnectedDisconnectCommand,
);

export default function Command() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checkingError, setCheckingError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const tokens = await googleOAuth.client.getTokens();
        const hasConnection = Boolean(tokens?.accessToken);

        if (!hasConnection) {
          await invalidateMenuBarSession();
        }

        if (active) setConnected(hasConnection);
      } catch (error) {
        if (!active) return;
        setCheckingError(
          error instanceof Error ? error.message : String(error),
        );
        setConnected(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (connected === null) {
    return <List isLoading />;
  }

  if (!connected) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title="Google Calendar is disconnected"
          description={
            checkingError ||
            "Connect DayCal again from any Google Calendar command."
          }
        />
      </List>
    );
  }

  return <AuthenticatedDisconnectCommand />;
}
