import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  getAuthState,
  getSavedAuthAccounts,
  redeemAuthHandoff,
  revokeAllAuthAccounts,
  revokeAuthAccount,
  setActiveAuthAccount,
  startAuthHandoff,
} from "./lib/auth";
import { getWebCullPreferences } from "./lib/preferences";
import { WebCullAuthState, WebCullSavedAccount } from "./types";

type HandoffState = {
  request: string;
  verifier: string;
  approvalUrl: string;
  expires: number;
};

type ConnectState = "idle" | "waiting" | "connected" | "error";

export default function ConnectAccount() {
  const [auth, setAuth] = useState<WebCullAuthState>({ connected: false });
  const [accounts, setAccounts] = useState<WebCullSavedAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<HandoffState | null>(null);
  const [state, setState] = useState<ConnectState>("idle");
  const [message, setMessage] = useState("Open WebCull in your browser to approve Raycast.");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    reloadAccountState();

    return () => {
      if (pollRef.current) {
        clearTimeout(pollRef.current);
      }
    };
  }, []);

  async function reloadAccountState() {
    const [nextAuth, saved] = await Promise.all([getAuthState(), getSavedAuthAccounts()]);
    setAuth(nextAuth);
    setAccounts(saved.accounts);
    setActiveAccountId(saved.activeAccountId);
    if (nextAuth.connected) {
      setState("connected");
      setMessage("Raycast is connected to WebCull.");
    } else if (state === "connected") {
      setState("idle");
      setMessage("Open WebCull in your browser to approve Raycast.");
    }
  }

  async function beginConnect() {
    try {
      if (pollRef.current) {
        clearTimeout(pollRef.current);
      }
      const nextHandoff = await startAuthHandoff();
      setHandoff(nextHandoff);
      setState("waiting");
      setMessage("Approve only if you started this WebCull connection just now.");
      poll(nextHandoff);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not start WebCull login.");
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not start WebCull login",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function poll(currentHandoff: HandoffState) {
    try {
      if (Date.now() > currentHandoff.expires) {
        setState("error");
        setMessage("WebCull login request expired. Start again.");
        return;
      }

      const response = await redeemAuthHandoff(currentHandoff.request, currentHandoff.verifier);

      if (response.success === "true") {
        await reloadAccountState();
        const nextAuth = await getAuthState();
        setState("connected");
        setMessage("Raycast is connected to WebCull.");
        await showToast({
          style: Toast.Style.Success,
          title: "Connected to WebCull",
          message: nextAuth.user?.email || nextAuth.user?.name,
        });
        return;
      }

      if (response.pending === "true") {
        pollRef.current = setTimeout(() => poll(currentHandoff), 2000);
        return;
      }

      setState("error");
      setMessage(response.failure || response.error || "WebCull login was not approved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Waiting for WebCull approval.");
      pollRef.current = setTimeout(() => poll(currentHandoff), 3000);
    }
  }

  async function disconnect() {
    if (!auth.accountId) {
      return;
    }
    try {
      await revokeAuthAccount(auth.accountId);
      setHandoff(null);
      await reloadAccountState();
      await showToast({
        style: Toast.Style.Success,
        title: "Logged out of active WebCull account",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not log out of WebCull",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function disconnectAll() {
    try {
      await revokeAllAuthAccounts();
      setHandoff(null);
      await reloadAccountState();
      await showToast({
        style: Toast.Style.Success,
        title: "Logged out of all saved WebCull accounts",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not log out of all saved accounts",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const preferences = getWebCullPreferences();
  const activeTitle = auth.connected ? accountTitle(auth) : "No active account";
  const title = state === "waiting" ? "Waiting for Browser Approval" : "Manage WebCull Account";

  if (state !== "waiting" && accounts.length) {
    return (
      <List>
        <List.Item
          icon={Icon.Person}
          title="Saved WebCull Accounts"
          subtitle={`Active: ${activeTitle}`}
          accessories={[{ text: String(accounts.length) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Saved Accounts"
                icon={Icon.Person}
                target={
                  <SavedAccountsView
                    initialAccounts={accounts}
                    initialActiveAccountId={activeAccountId}
                    onChange={reloadAccountState}
                  />
                }
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.PlusCircle}
          title="Add WebCull Account"
          subtitle="Connect another WebCull account through browser approval."
          actions={
            <ActionPanel>
              <Action title="Add WebCull Account" icon={Icon.PlusCircle} onAction={beginConnect} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Globe}
          title="Open WebCull Account"
          subtitle="Manage accounts in the WebCull web app."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open WebCull Account"
                icon={Icon.Globe}
                url={`${preferences.appBaseUrl}/accounts`}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Trash}
          title="Log Out Active Account"
          subtitle="Revoke and remove the active Raycast token."
          actions={
            <ActionPanel>
              <Action
                title="Log Out Active Account"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={disconnect}
              />
            </ActionPanel>
          }
        />
        {accounts.length > 1 ? (
          <List.Item
            icon={Icon.XMarkCircle}
            title="Log Out All Accounts"
            subtitle="Revoke every WebCull token saved in this Raycast installation."
            actions={
              <ActionPanel>
                <Action
                  title="Log Out All Accounts"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  onAction={disconnectAll}
                />
              </ActionPanel>
            }
          />
        ) : null}
      </List>
    );
  }

  return (
    <List>
      <List.Item
        icon={
          auth.connected ? Icon.CheckCircle : state === "error" ? Icon.ExclamationMark : Icon.Person
        }
        title={title}
        subtitle={message}
        actions={
          <ActionPanel>
            {!auth.connected ? (
              <Action title="Open WebCull Login" icon={Icon.Link} onAction={beginConnect} />
            ) : null}
            {handoff ? (
              <Action.OpenInBrowser title="Open Approval Page" url={handoff.approvalUrl} />
            ) : null}
          </ActionPanel>
        }
      />
    </List>
  );
}

function SavedAccountsView({
  initialAccounts,
  initialActiveAccountId,
  onChange,
}: {
  initialAccounts: WebCullSavedAccount[];
  initialActiveAccountId: string | null;
  onChange: () => Promise<void>;
}) {
  const [accounts, setAccounts] = useState<WebCullSavedAccount[]>(initialAccounts);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(initialActiveAccountId);

  async function reload() {
    const saved = await getSavedAuthAccounts();
    setAccounts(saved.accounts);
    setActiveAccountId(saved.activeAccountId);
    await onChange();
  }

  async function useAccount(account: WebCullSavedAccount) {
    await setActiveAuthAccount(account.accountId);
    await reload();
    await showToast({
      style: Toast.Style.Success,
      title: "Active WebCull account changed",
      message: accountTitle(account),
    });
  }

  async function removeAccount(account: WebCullSavedAccount) {
    try {
      await revokeAuthAccount(account.accountId);
      await reload();
      await showToast({
        style: Toast.Style.Success,
        title: "Logged out of WebCull account",
        message: accountTitle(account),
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not log out of WebCull account",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List>
      {accounts.map((account) => {
        const isActive = account.accountId === activeAccountId;
        return (
          <List.Item
            key={account.accountId}
            icon={isActive ? Icon.CheckCircle : Icon.Person}
            title={accountTitle(account)}
            subtitle={isActive ? "Active account" : "Saved account"}
            accessories={isActive ? [{ text: "Active" }] : []}
            actions={
              <ActionPanel>
                <Action
                  title={isActive ? "Keep as Active Account" : "Set as Active Account"}
                  icon={Icon.CheckCircle}
                  onAction={() => useAccount(account)}
                />
                <Action
                  title="Log Out Saved Account"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => removeAccount(account)}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function accountTitle(account: Pick<WebCullSavedAccount | WebCullAuthState, "user">): string {
  return account.user?.email || account.user?.name || "WebCull Account";
}
