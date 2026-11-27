import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { connectAccount, disconnectAccount } from "./accounts";
import { Account, errorMessage } from "./domain";
import { readAccounts } from "./state";

export default function ManageWorkspaces({ navigationTitle }: { navigationTitle?: string } = {}) {
  const { data: accounts = [], error, isLoading, revalidate } = usePromise(readAccounts);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  async function connect(expected?: Account) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Connecting to Slack" });
    try {
      const account = await connectAccount(expected);
      toast.style = Toast.Style.Success;
      toast.title = `Connected to ${account.teamName}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Connect Workspace";
      toast.message = errorMessage(error);
    } finally {
      revalidate();
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function disconnect(account: Account) {
    if (inFlight.current) return;
    inFlight.current = true;
    if (
      !(await confirmAlert({
        title: `Disconnect ${account.teamName}?`,
        message: `Remove the saved connection for ${account.userName}. Your Slack status and notification settings stay as they are.`,
        primaryAction: { title: "Disconnect", style: Alert.ActionStyle.Destructive },
      }))
    ) {
      inFlight.current = false;
      return;
    }
    setBusy(true);
    try {
      await disconnectAccount(account.id);
      await showToast({ style: Toast.Style.Success, title: "Workspace Disconnected" });
    } catch (error) {
      await showFailureToast(errorMessage(error), { title: "Could Not Disconnect" });
    } finally {
      revalidate();
      inFlight.current = false;
      setBusy(false);
    }
  }
  const commonActions = (
    <>
      <Action title="Connect Workspace" icon={Icon.Plus} onAction={() => connect()} />
      <Action
        title="Refresh Workspaces"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="Open Slack App Settings" url="https://api.slack.com/apps" />
    </>
  );
  if (error)
    return (
      <Detail
        markdown={`# Could Not Load Workspaces\n\n${errorMessage(error)}`}
        actions={<ActionPanel>{commonActions}</ActionPanel>}
      />
    );
  return (
    <List
      isLoading={isLoading || busy}
      navigationTitle={navigationTitle}
      searchBarPlaceholder="Search connected workspaces…"
    >
      {!isLoading && accounts.length === 0 && (
        <List.EmptyView
          title="Connect Your Slack Workspaces"
          description="Authorize each workspace once. You can connect a workspace even when it is not open in Slack."
          icon={Icon.PersonCircle}
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      )}
      {accounts.map((account) => (
        <List.Item
          key={account.id}
          title={account.teamName}
          subtitle={account.userName}
          icon="slack-accounts-status.png"
          accessories={[
            {
              text:
                account.state === "ready"
                  ? "Saved"
                  : account.state === "connecting"
                    ? "Connection Pending"
                    : "Disconnect Pending",
              tooltip:
                account.state === "ready"
                  ? "Slack access is checked when you apply a status."
                  : "Retry the pending action to finish updating this connection.",
            },
          ]}
          actions={
            <ActionPanel>
              {commonActions}
              <Action title="Reconnect Workspace" icon={Icon.ArrowClockwise} onAction={() => connect(account)} />
              <Action
                title="Disconnect Workspace"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => disconnect(account)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
