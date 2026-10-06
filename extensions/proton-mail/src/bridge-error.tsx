import { Action, ActionPanel, getApplications, Icon, List, open, openExtensionPreferences } from "@raycast/api";
import { BridgeErrorReason } from "./imap-client";

const BRIDGE_BUNDLE_ID = "com.protonmail.bridge";

async function openBridge() {
  try {
    const applications = await getApplications();
    const bridge = applications.find(
      (application) => application.bundleId === BRIDGE_BUNDLE_ID || application.name === "Proton Mail Bridge",
    );
    if (bridge) {
      await open(bridge.path);
      return;
    }
  } catch {
    // Fall back to the download page below
  }
  await open("https://proton.me/mail/bridge");
}

// Shown instead of an empty folder when Bridge can't be reached or rejects the credentials
export function BridgeErrorView({ reason, onRetry }: { reason: BridgeErrorReason; onRetry: () => void }) {
  const retry = (
    <Action
      title="Try Again"
      icon={Icon.ArrowClockwise}
      onAction={onRetry}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
    />
  );
  const preferences = (
    <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
  );
  const bridge = <Action title="Open Proton Mail Bridge" icon={Icon.AppWindow} onAction={openBridge} />;

  if (reason === "authentication") {
    return (
      <List.EmptyView
        icon={Icon.Lock}
        title="Proton Mail Bridge Rejected Your Credentials"
        description="Use the username and password from Bridge's mailbox details, not your Proton account password."
        actions={
          <ActionPanel>
            {preferences}
            {bridge}
            {retry}
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List.EmptyView
      icon={Icon.Plug}
      title="Proton Mail Bridge Isn't Running"
      description="Start Proton Mail Bridge, then try again."
      actions={
        <ActionPanel>
          {bridge}
          {retry}
          {preferences}
        </ActionPanel>
      }
    />
  );
}
