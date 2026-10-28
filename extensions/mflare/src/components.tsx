import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { clearConnection, listAccounts, MFlareError, openMFlare, parseConnection, saveConnection } from "./mflare";

// The Account the commands show, kept across launches and shared by every command. Until one is picked, or once the
// picked one is no longer monitored, it's MFlare's Current Account.
//
// When the dropdown appears, Raycast selects its first item and calls onChange with it if that isn't the value, which
// would store the first Account over the picked one. So the Accounts are listed with the shown one first, in the
// order they had when they were read, and the dropdown appears already showing its first item.
export function useAccountSelection() {
  const [picked, setPicked] = useCachedState<string | undefined>("accountId", undefined);
  const accounts = usePromise(listAccounts, [], QUIET);
  const current = accounts.data?.find((account) => account.is_current)?.id;
  const accountId = accounts.data?.some((account) => account.id === picked) ? picked : current;
  const listed = useMemo(
    () => (accounts.data ?? []).toSorted((a, b) => Number(b.id === accountId) - Number(a.id === accountId)),
    // Only when the Accounts are read again: moving the picked one up on every change would reorder the open menu.
    [accounts.data],
  );
  const account = accounts.data?.find((candidate) => candidate.id === accountId);

  const dropdown =
    listed.length > 1 && accountId ? (
      <List.Dropdown tooltip="Account" value={accountId} onChange={setPicked}>
        {listed.map((candidate) => (
          <List.Dropdown.Item
            key={candidate.id}
            value={candidate.id}
            title={candidate.name}
            icon={
              candidate.needs_reauthorization ? { source: Icon.ExclamationMark, tintColor: Color.Orange } : undefined
            }
          />
        ))}
      </List.Dropdown>
    ) : undefined;

  return {
    accounts,
    accountId,
    // MFlare can't refresh it until its User signs in again, so what shows may be out of date.
    needsReauthorization: account?.needs_reauthorization ?? false,
    hasNoAccounts: accounts.data?.length === 0,
    // Commands wait for `isReady` before reading, so they never read one Account and then another, nor read
    // without one.
    isReady: (accounts.data?.length ?? 0) > 0,
    dropdown,
  };
}

// Why a command needs a connection pasted: there's none, the one kept isn't one, or MFlare refused its token.
export type ConnectionProblem = "noConnection" | "badConnection" | "unauthorized";

export function connectionProblem(error: Error | undefined): ConnectionProblem | undefined {
  if (!(error instanceof MFlareError)) return undefined;
  return error.kind === "noConnection" || error.kind === "badConnection" || error.kind === "unauthorized"
    ? error.kind
    : undefined;
}

const PROBLEM_TEXT: Record<ConnectionProblem, string> = {
  noConnection: "In MFlare, open Settings › Integrations, turn on Raycast and click Copy Connection.",
  badConnection: "The connection kept here isn't one from MFlare. Copy it again from MFlare's Settings › Integrations.",
  unauthorized:
    "MFlare didn't accept the connection kept here: its token may have been regenerated. Copy it again from MFlare's Settings › Integrations.",
};

// Optional `onError` for the commands' reads: their own views say what went wrong, so the toast usePromise shows by
// default would only repeat it.
export const QUIET = { onError: () => undefined };

// Takes the connection MFlare's Settings › Integrations › Copy Connection gives, filled in from the clipboard when it
// holds one. A command shows it in place of its list while it can't reach MFlare with what it has (`problem`); pushed
// from an action, it goes back once connected.
export function ConnectionForm({ onConnected, problem }: { onConnected: () => void; problem?: ConnectionProblem }) {
  const { pop } = useNavigation();
  const [connection, setConnection] = useState("");
  const [error, setError] = useState<string>();
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (!text) return;
      try {
        parseConnection(text);
        setConnection((typed) => typed || text.trim());
      } catch {
        // Not a connection: leave the field for the user.
      }
    });
  }, []);

  // Kept only once MFlare takes it, so "Connected" is true; otherwise the field says why.
  async function connect(values: { connection: string }) {
    setIsChecking(true);
    try {
      await saveConnection(values.connection);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
      return;
    } finally {
      setIsChecking(false);
    }
    await showToast({ style: Toast.Style.Success, title: "Connected to MFlare" });
    // In place of the list, reading again brings the list back; pushed, there's a list to go back to.
    if (!problem) pop();
    onConnected();
  }

  return (
    <Form
      isLoading={isChecking}
      navigationTitle="Connect to MFlare"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect" icon={Icon.Link} onSubmit={connect} />
          <Action
            title="Open MFlare Integrations"
            icon={Icon.AppWindow}
            onAction={() => openMFlare({ page: "integrations" })}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={PROBLEM_TEXT[problem ?? "noConnection"]} />
      <Form.PasswordField
        id="connection"
        title="Connection"
        placeholder="mflare://127.0.0.1:47823?token=…"
        value={connection}
        error={error}
        onChange={(value) => {
          setConnection(value);
          setError(undefined);
        }}
      />
    </Form>
  );
}

// Lets a command take a new connection, or forget the one it has. `onChange` reads everything again.
export function ConnectionActions({ onChange }: { onChange: () => void }) {
  return (
    <ActionPanel.Section title="Connection">
      <Action.Push title="Change Connection…" icon={Icon.Link} target={<ConnectionForm onConnected={onChange} />} />
      <Action
        title="Clear Connection"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={async () => {
          const confirmed = await confirmAlert({
            title: "Clear the connection?",
            message: "The extension stops reaching MFlare until you paste a connection again.",
            primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
          });
          if (!confirmed) return;
          await clearConnection();
          onChange();
        }}
      />
    </ActionPanel.Section>
  );
}

// MFlare is reached but monitors no Account: no User is signed in to Cloudflare yet.
export function NoAccountsView({ onRetry }: { onRetry: () => void }) {
  return (
    <List.EmptyView
      icon={{ source: Icon.Person, tintColor: Color.Orange }}
      title="Sign in to Cloudflare in MFlare"
      description="MFlare isn't monitoring any Cloudflare Account yet. Sign in from its menu bar Panel, then try again."
      actions={
        <ActionPanel>
          <Action title="Open MFlare" icon={Icon.AppWindow} onAction={() => openMFlare()} />
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <ConnectionActions onChange={onRetry} />
        </ActionPanel>
      }
    />
  );
}

// Said where a command first shows its data when MFlare can't refresh the Account.
export const REAUTHORIZE_NOTE = "Sign in again in MFlare to update";

// What went wrong reaching MFlare, and what to do about it. A missing, malformed or refused connection leads to the
// form that takes a new one.
export function ErrorView({ error, onRetry, failedTitle }: { error: Error; onRetry: () => void; failedTitle: string }) {
  const kind = error instanceof MFlareError ? error.kind : "failed";
  const views = {
    noConnection: {
      title: "Connect to MFlare",
      description:
        "In MFlare, open Settings › Integrations, turn on Raycast and click Copy Connection. Then press ↵ to paste it.",
    },
    badConnection: {
      title: "That isn't a connection from MFlare",
      description: "Copy the connection again from MFlare's Settings › Integrations, then press ↵ to paste it.",
    },
    unauthorized: {
      title: "MFlare didn't accept the connection",
      description:
        "Its token may have been regenerated. Copy the connection again from MFlare's Settings › Integrations, then press ↵ to paste it.",
    },
    offline: {
      title: "Can't reach MFlare",
      description: "Make sure MFlare is running and Raycast is on in its Settings › Integrations.",
    },
    needsPro: {
      title: "Raycast needs MFlare Pro",
      description: "Activate a License in MFlare, then turn on Raycast in Settings › Integrations.",
    },
    failed: { title: failedTitle, description: error.message },
  };
  const view = views[kind];
  const needsConnection = kind === "noConnection" || kind === "badConnection" || kind === "unauthorized";
  // Where in MFlare's Settings the fix is: turning Raycast on and copying its connection, or activating Pro.
  const settings = kind === "needsPro" ? "license" : kind === "failed" ? undefined : "integrations";
  const openSettings = () => openMFlare(settings ? { page: settings } : undefined);
  const openTitle =
    settings === "license" ? "Open MFlare License" : settings ? "Open MFlare Integrations" : "Open MFlare";

  return (
    <List.EmptyView
      icon={{ source: needsConnection ? Icon.Link : Icon.Plug, tintColor: Color.Orange }}
      title={view.title}
      description={view.description}
      actions={
        <ActionPanel>
          {needsConnection ? (
            <>
              <Action.Push
                title="Paste Connection"
                icon={Icon.Link}
                target={<ConnectionForm onConnected={onRetry} />}
              />
              <Action title={openTitle} icon={Icon.AppWindow} onAction={openSettings} />
            </>
          ) : (
            <>
              <Action title={openTitle} icon={Icon.AppWindow} onAction={openSettings} />
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
              <ConnectionActions onChange={onRetry} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
