import { DiscoverBridges } from "./discovery-ui.js";
export { DiscoverBridges } from "./discovery-ui.js";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  confirmAlert,
  Alert,
  getPreferenceValues,
  popToRoot,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import type { Pairing } from "./protocol.js";
import { HubError, remotePrompt, safeMarkdown } from "./core.js";
import { errorText, useHub } from "./hooks.js";
import {
  ACTIVE_CONNECTION_KEY,
  CONNECTIONS_KEY,
  activateProfile,
  connectionChanged,
  profiles,
  removeProfile,
  saveProfile,
  type BridgeProfile,
} from "./connections.js";
import { setupGuide, setupAddress, setupModes, tunnelCommand, type SetupMode } from "./setup.js";
type Props = {
  onConnected: () => void;
};
function ConnectionGuide() {
  return (
    <Detail
      navigationTitle="Argo Connection Guide"
      markdown={setupGuide}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Public Installation Instructions"
            url="https://github.com/MatrixA/argo/blob/v0.1.3/docs/connect.md"
          />
          <Action.OpenInBrowser
            title="Codex Connection Instructions"
            url="https://github.com/MatrixA/argo/blob/v0.1.3/docs/connect-codex.md"
          />
        </ActionPanel>
      }
    />
  );
}
function ExistingBridge({ onConnected }: Props) {
  const [name, setName] = useState("My bridge"),
    [path, setPath] = useState("~/.argo/client.json"),
    [url, setUrl] = useState("http://127.0.0.1:48123");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const lock = useRef(false);
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Use an Existing Bridge"
      enableDrafts={false}
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Test and Use Connection"
            onSubmit={async () => {
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              setError(undefined);
              try {
                await saveProfile(LocalStorage, { name, configPath: path, url });
                onConnected();
                pop();
                await showToast({ style: Toast.Style.Success, title: "Bridge verified and selected" });
              } catch (cause) {
                setError(
                  cause instanceof HubError
                    ? errorText(cause)
                    : "Could not verify this bridge. Check the private configuration file, loopback address and SSH tunnel. Your current connection was not changed.",
                );
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          />
          <Action.Push title="Server Bridge Setup Guide" target={<ConnectionGuide />} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Private credentials, not pasted tokens"
        text="Select an existing private client configuration file on this Mac. For a server bridge, privately transfer the file created by export-client first. Argo verifies authentication before switching. Credentials never enter Raycast preferences or Agent chat."
      />
      <Form.TextField id="name" title="Connection Name" value={name} onChange={setName} />
      <Form.TextField id="configPath" title="Private Config Path" value={path} onChange={setPath} />
      <Form.TextField id="url" title="Address From This Mac" value={url} onChange={setUrl} />
      <Form.Description text="This address belongs to Raycast. The Agent may use a different loopback address for the same bridge. Both local and remote forwards work." />
      {error ? <Form.Description title="Connection Not Changed" text={error} /> : null}
    </Form>
  );
}
function PairAgent({
  mode,
  onConnected,
}: Props & {
  mode: SetupMode;
}) {
  const feed = useHub();
  const { pop } = useNavigation();
  const [name, setName] = useState(mode === "local" ? "local-backend" : "remote-backend");
  const [url, setUrl] = useState(() => setupAddress(mode));
  const [target, setTarget] = useState("");
  const [bridgeUrl, setBridgeUrl] = useState("http://127.0.0.1:48123"),
    [macUrl, setMacUrl] = useState("http://127.0.0.1:48123");
  const [agent, setAgent] = useState("claude"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const [pairing, setPairing] = useState<
    Pairing & {
      name: string;
      url: string;
      connectionKey: string;
      adapter: "claude" | "codex";
    }
  >();
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false);
  const edited = useRef(false);
  useEffect(() => {
    if (mode === "local" && feed.address && !edited.current) setUrl(feed.address);
  }, [mode, feed.address]);
  useEffect(() => {
    if (!pairing) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pairing]);
  if (pairing) {
    const expired = now >= pairing.expiresAt;
    const changed = feed.connectionKey !== pairing.connectionKey;
    const prompt = remotePrompt(pairing.name, pairing.url, pairing.code, pairing.adapter);
    const preview = prompt.replace(pairing.code, "[private single-use code included when copied]");
    return (
      <Detail
        navigationTitle={expired ? "Pairing Code Expired" : "Ready to Connect Your Agent"}
        markdown={`# ${expired ? "Create a fresh pairing prompt" : "Copy this prompt to your existing " + (pairing.adapter === "codex" ? "Codex" : "Claude")}\n\n${changed ? "The selected bridge changed. Return to sessions and create a prompt on the intended bridge. The previous code expires automatically." : expired ? "The unused code has expired. Nothing was connected by copying the prompt alone." : "Installation and attachment happen in the same existing Agent session. GitHub distributes code only. The code is hidden here and included in the confidential copy action."}\n\n**${expired ? "Expired" : "Expires in " + Math.ceil((pairing.expiresAt - now) / 60000) + " min"}** · Single use · ${safeMarkdown(pairing.name)}\n\nAgent address: ${safeMarkdown(pairing.url)}\n\n${safeMarkdown(preview)}\n\nCodex requires its exact current thread on an existing shared App Server and remains experimental. After the Agent attaches, return to Agent Sessions. A session is usable only when it reports ready, not merely because the port responds.`}
        actions={
          <ActionPanel>
            {!expired && !changed ? (
              <Action.CopyToClipboard title="Copy Private Agent Prompt" content={prompt} concealed />
            ) : null}
            <Action
              title={expired ? "Generate New Prompt" : "Replace Pairing Code"}
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                if (lock.current || !feed.hub.current || changed) return;
                lock.current = true;
                try {
                  await feed.hub.current.cancelPairing(pairing.code);
                  setPairing(undefined);
                } catch (cause) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Could not replace code",
                    message: errorText(cause),
                  });
                } finally {
                  lock.current = false;
                }
              }}
            />
            <Action
              title="Return to Sessions"
              icon={Icon.List}
              onAction={() => {
                onConnected();
                void popToRoot({ clearSearchBar: true });
              }}
            />
            <Action
              title="Cancel Unused Code"
              icon={Icon.XMarkCircle}
              onAction={async () => {
                if (!feed.hub.current || changed) return;
                try {
                  await feed.hub.current.cancelPairing(pairing.code);
                  onConnected();
                  pop();
                } catch (cause) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Could not cancel code",
                    message: errorText(cause),
                  });
                }
              }}
            />
          </ActionPanel>
        }
      />
    );
  }
  let tunnel: string | undefined, tunnelError: string | undefined;
  try {
    tunnel = tunnelCommand(mode, target, url, bridgeUrl, macUrl);
  } catch (cause) {
    tunnelError = cause instanceof Error ? cause.message : "Check tunnel details";
  }
  const online = Boolean(feed.hub.current && feed.connection === "live" && !feed.error);
  return (
    <Form
      navigationTitle={setupModes[mode].title}
      enableDrafts={false}
      isLoading={busy || feed.loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={agent === "claude" ? "Create Private Pairing Prompt" : "Create Experimental Codex Prompt"}
            onSubmit={async () => {
              if (lock.current) return;
              if (!online) {
                setError(
                  "Connect Raycast to a working bridge first. Open Connection Setup to verify its address and private configuration.",
                );
                return;
              }
              let input: {
                name: string;
                url: string;
                adapter: "claude" | "codex";
              };
              try {
                input = { name: name.trim(), url: url.trim(), adapter: agent === "codex" ? "codex" : "claude" };
                if (!input.name || input.name.length > 100) throw new Error();
                remotePrompt(input.name, input.url, "ARGO-" + "0".repeat(32));
              } catch {
                setError("Enter a session name and a loopback HTTP address as seen from the Agent machine.");
                return;
              }
              lock.current = true;
              setBusy(true);
              setError(undefined);
              try {
                const connectionKey = feed.connectionKey!;
                const next = await feed.hub.current!.createPairing(input.name, input.adapter);
                setNow(Date.now());
                setPairing({ ...next, ...input, connectionKey });
              } catch (cause) {
                setError(errorText(cause));
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          />
          {tunnel ? (
            <Action.CopyToClipboard title={`Copy Tunnel Command · ${setupModes[mode].runOn}`} content={tunnel} />
          ) : null}
          <Action.Push
            title="Select or Configure Bridge"
            target={
              <Setup
                onConnected={() => {
                  feed.reconnect();
                  onConnected();
                }}
              />
            }
          />
          <Action.Push
            title={agent === "claude" ? "Connection Guide" : "Codex Experimental Guide"}
            target={<ConnectionGuide />}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Use what you already have" text={setupModes[mode].description} />
      <Form.Description
        title={online ? `Verified · ${feed.profileName}` : "Bridge not connected"}
        text={
          online
            ? `Raycast reaches ${feed.address}. Agent reachability is checked during claim and attach.`
            : feed.error || "Checking bridge authentication…"
        }
      />
      <Form.Dropdown id="agent" title="Agent" value={agent} onChange={setAgent}>
        <Form.Dropdown.Item value="claude" title="Claude Code · Existing session handoff" />
        <Form.Dropdown.Item value="codex" title="Codex · Experimental shared runtime" />
      </Form.Dropdown>
      <Form.TextField id="name" title="Session Name" value={name} onChange={setName} />
      <Form.TextField
        id="agentUrl"
        title="Address From Agent"
        value={url}
        onChange={(value) => {
          edited.current = true;
          setUrl(value);
        }}
      />
      {mode !== "local" && mode !== "existing" ? (
        <>
          <Form.Separator />
          <Form.Description
            title="Optional tunnel helper"
            text="Already have a working tunnel? Keep it. These commands are examples you can copy and run, never executed automatically. Ports may differ on each machine."
          />
          <Form.TextField
            id="sshTarget"
            title={mode === "remote-local" ? "Mac SSH Alias" : "Server SSH Alias"}
            value={target}
            onChange={setTarget}
          />
          <Form.TextField id="bridgeUrl" title="Bridge Host Address" value={bridgeUrl} onChange={setBridgeUrl} />
          {mode === "server-forward" ? (
            <Form.TextField id="macUrl" title="Mac Listener Address" value={macUrl} onChange={setMacUrl} />
          ) : null}
          <Form.Description
            title={setupModes[mode].runOn}
            text={tunnel || tunnelError || "Fill the SSH alias to generate a command."}
          />
        </>
      ) : null}
      {mode === "server-forward" ? (
        <Form.Description
          title="Before pairing"
          text="Run the bridge on the server, open the local forward on your Mac, then use Select or Configure Bridge to import its private client file. A Mac bridge's pairing code cannot authorize a different server bridge."
        />
      ) : null}
      <Form.Description
        title="Current-session handoff, not background listening"
        text="Claude waits for Raycast in its current turn. Existing background processes continue. Tool permissions stay in its original terminal. No restart, model replacement, or permission bypass."
      />
      {agent === "codex" ? (
        <Form.Description
          title="Not a Claude skill"
          text="Codex must already use a shared App Server and an exact loaded thread. Native populated-session acceptance is still unverified. The generated prompt checks prerequisites first. It never replaces this session or starts another model."
        />
      ) : null}
      {error ? <Form.Description title="Not Yet Connected" text={error} /> : null}
    </Form>
  );
}
export function Setup({ onConnected }: Props) {
  const feed = useHub();
  const { push, pop } = useNavigation();
  const [entries, setEntries] = useState<BridgeProfile[]>([]);
  const [settingsError, setSettingsError] = useState(false);
  const preference = getPreferenceValues<{
    configPath?: string;
  }>().configPath;
  useEffect(() => {
    void profiles(LocalStorage)
      .then(setEntries)
      .catch(() => setSettingsError(true));
  }, []);
  async function select(id: string) {
    try {
      await activateProfile(LocalStorage, id, preference);
      onConnected();
      pop();
    } catch (cause) {
      await showToast({ style: Toast.Style.Failure, title: "Connection not changed", message: errorText(cause) });
    }
  }
  const actions = (
    <>
      <Action.Push title="Find Forwarded Server Bridges" target={<DiscoverBridges onConnected={onConnected} />} />
      <Action.Push
        title="Add Existing Bridge"
        target={
          <ExistingBridge
            onConnected={() => {
              feed.reconnect();
              onConnected();
              void profiles(LocalStorage).then(setEntries);
            }}
          />
        }
      />
      <Action.Push title="Open Setup Guide" target={<ConnectionGuide />} />
    </>
  );
  return (
    <List
      navigationTitle="Argo · Connection Setup"
      searchBarPlaceholder="Find your setup or bridge"
      isLoading={feed.loading}
      actions={<ActionPanel>{actions}</ActionPanel>}
    >
      <List.Section title="Connection">
        <List.Item
          title={feed.connection === "live" ? feed.profileName : "Bridge needs attention"}
          subtitle={feed.address || feed.error || "Checking private configuration"}
          icon={{
            source: feed.connection === "live" ? Icon.Checkmark : Icon.Warning,
            tintColor: feed.connection === "live" ? Color.Green : Color.Orange,
          }}
          actions={
            <ActionPanel>
              <Action title="Test Again" icon={Icon.ArrowClockwise} onAction={feed.reconnect} />
              {actions}
            </ActionPanel>
          }
        />
        <List.Item
          title="Use an Existing Bridge"
          subtitle="Private config file + local address · Test before switching"
          icon={Icon.Plug}
          actions={<ActionPanel>{actions}</ActionPanel>}
        />
      </List.Section>
      <List.Section title="Server-first setup">
        <List.Item
          title="Set Up a Fresh Server"
          subtitle="Copy one GitHub prompt · Ordinary port forwarding · Discover and pair once"
          icon={Icon.Network}
          actions={
            <ActionPanel>
              <Action.Push
                title="Find Forwarded Server Bridges"
                target={<DiscoverBridges onConnected={onConnected} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Connect an Agent" subtitle="Choose where things run, not a forwarding flag">
        {(Object.entries(setupModes) as Array<[SetupMode, (typeof setupModes)[SetupMode]]>).map(([mode, item]) => (
          <List.Item
            key={mode}
            title={item.title}
            subtitle={item.description}
            keywords={["local", "remote", "forward", "tunnel", mode]}
            icon={mode === "local" ? Icon.Desktop : Icon.Network}
            actions={
              <ActionPanel>
                <Action
                  title="Continue Setup"
                  onAction={() => push(<PairAgent mode={mode} onConnected={onConnected} />)}
                />
                {actions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Switch Bridge" subtitle="Config references only · Credentials stay in private files">
        <List.Item
          title="Default bridge"
          subtitle={preference || "~/.argo/client.json"}
          accessories={feed.profileId === "default" ? [{ tag: "Active" }] : []}
          actions={
            <ActionPanel>
              <Action title="Test and Use Default" onAction={() => select("default")} />
              {actions}
            </ActionPanel>
          }
        />
        {entries.map((entry) => (
          <List.Item
            key={entry.id}
            title={entry.name}
            subtitle={entry.url || entry.configPath}
            accessories={entry.id === feed.profileId ? [{ tag: "Active" }] : []}
            actions={
              <ActionPanel>
                <Action title="Test and Use Bridge" onAction={() => select(entry.id)} />
                <Action
                  title="Remove Saved Connection"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      !(await confirmAlert({
                        title: "Remove this saved connection?",
                        message:
                          "Only this Mac's reference is removed. The bridge, credentials and Agent keep running.",
                        primaryAction: { title: "Remove Reference", style: Alert.ActionStyle.Destructive },
                      }))
                    )
                      return;
                    await removeProfile(LocalStorage, entry.id);
                    setEntries(await profiles(LocalStorage));
                    feed.reconnect();
                    onConnected();
                  }}
                />
                {actions}
              </ActionPanel>
            }
          />
        ))}
        {settingsError ? (
          <List.Item
            title="Reset Invalid Saved Connections"
            subtitle="Does not delete credentials, conversations or bridge data"
            icon={Icon.Warning}
            actions={
              <ActionPanel>
                <Action
                  title="Reset Saved References"
                  onAction={async () => {
                    await LocalStorage.removeItem(CONNECTIONS_KEY);
                    await LocalStorage.removeItem(ACTIVE_CONNECTION_KEY);
                    setEntries([]);
                    setSettingsError(false);
                    connectionChanged();
                    feed.reconnect();
                    onConnected();
                  }}
                />
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>
      <List.Section title="Need a Bridge First?">
        <List.Item
          title="Start a Bridge on This Mac or a Server"
          subtitle="Install the public runtime, then run serve · No automatic system changes"
          icon={Icon.Terminal}
          actions={
            <ActionPanel>
              <Action.Push title="Open Bootstrap and Topology Guide" target={<ConnectionGuide />} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
