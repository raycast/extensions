import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  environment,
  getPreferenceValues,
  showToast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { join } from "node:path";
import { discoverBridges, pairDiscoveredBridge, portRange, type DiscoveredBridge } from "./discovery.js";
import { profiles, saveProfile } from "./connections.js";
import { serverSetupPrompt, SERVER_SETUP_URL } from "./server-prompt.js";
function PairBridge({ target, done }: { target: DiscoveredBridge; done: () => void }) {
  const [code, setCode] = useState(""),
    [name, setName] = useState(`Server · ${new URL(target.url).port}`);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<string>();
  const claimed = useRef<string | undefined>(undefined);
  const lock = useRef(false);
  return (
    <Form
      navigationTitle="Pair This Server Once"
      enableDrafts={false}
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Verify and Pair Server"
            onSubmit={async () => {
              if (lock.current) return;
              lock.current = true;
              setBusy(true);
              setError(undefined);
              try {
                if (!name.trim() || name.trim().length > 100)
                  throw new Error("Enter a connection name, at most 100 characters.");
                const existing = await profiles(LocalStorage);
                if (existing.length >= 30) throw new Error("Remove an unused saved bridge before pairing.");
                const path =
                  claimed.current ??
                  (await pairDiscoveredBridge(target, code, join(environment.supportPath, "clients")));
                claimed.current = path;
                setCode("");
                await saveProfile(LocalStorage, { name: name.trim(), configPath: path, url: target.url });
                done();
                await showToast({ style: Toast.Style.Success, title: "Server paired and remembered" });
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Pairing failed. Request a fresh Mac pairing code from the server.",
                );
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Forwarded bridge" text={target.url} />
      <Form.Description title="Bridge identity" text={target.bridgeId} />
      <Form.Description text="Paste only the short-lived Mac pairing code returned by server setup. It binds this identity and authorizes control of this bridge's Agent sessions. Discovery alone is not authorization. Use only your own trusted loopback listener or SSH forward. Signed discovery does not protect against a malicious local proxy. Durable credentials stay in a private file on this Mac." />
      <Form.TextField id="name" title="Server Name" value={name} onChange={setName} />
      {!claimed.current ? (
        <Form.PasswordField id="code" title="Mac Pairing Code" value={code} onChange={setCode} />
      ) : (
        <Form.Description text="Pairing was claimed and saved privately. Submit again to retry saving the connection reference without consuming another code." />
      )}
      {error ? <Form.Description title="Not Yet Paired" text={error} /> : null}
    </Form>
  );
}
export function DiscoverBridges({ onConnected }: { onConnected: () => void }) {
  const [targets, setTargets] = useState<DiscoveredBridge[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const { push, pop } = useNavigation();
  const prefs = getPreferenceValues<{ portStart?: string; portEnd?: string }>();
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError(undefined);
    void (async () => {
      try {
        const result = await discoverBridges(
          portRange(prefs.portStart || 49120, prefs.portEnd || 49139),
          controller.signal,
        );
        if (!controller.signal.aborted) setTargets(result);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Discovery failed.");
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    })();
    return () => controller.abort();
  }, [attempt, prefs.portStart, prefs.portEnd]);
  const actions = (
    <>
      <Action.CopyToClipboard title="Copy Fresh Server Setup Prompt" content={serverSetupPrompt} />
      <Action
        title="Scan Forwarded Ports Again"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => setAttempt((n) => n + 1)}
      />
      <Action.OpenInBrowser title="Open Server Setup Instructions" url={SERVER_SETUP_URL} />
    </>
  );
  return (
    <List
      navigationTitle="Find Your Servers"
      isLoading={busy}
      searchBarPlaceholder="Find a forwarded Argo bridge"
      actions={<ActionPanel>{actions}</ActionPanel>}
    >
      <List.Section title="Start from an unconfigured server">
        <List.Item
          title="Copy Server Setup Prompt"
          subtitle="Give your existing Agent one GitHub-based prompt. No Argo installation or bridge config needed."
          icon={Icon.Clipboard}
          actions={<ActionPanel>{actions}</ActionPanel>}
        />
        <List.Item
          title="Forward the returned server port"
          subtitle={`Use ordinary Port Forwarding into Mac ports ${prefs.portStart || 49120}–${prefs.portEnd || 49139}, then scan again.`}
          icon={Icon.Network}
          actions={
            <ActionPanel>
              <Action title="Scan Forwarded Ports Again" onAction={() => setAttempt((n) => n + 1)} />
              {actions}
            </ActionPanel>
          }
        />
      </List.Section>
      {error ? <List.Item title={error} icon={Icon.Warning} actions={<ActionPanel>{actions}</ActionPanel>} /> : null}
      <List.Section title="Discovered bridges" subtitle="Signed identity · Use a trusted forward · Pair once">
        {targets.map((target) => (
          <List.Item
            key={target.url}
            title={target.url}
            subtitle={`Identity ${target.bridgeId.slice(0, 16)}`}
            icon={Icon.Link}
            actions={
              <ActionPanel>
                <Action
                  title="Pair This Server"
                  onAction={() =>
                    push(
                      <PairBridge
                        target={target}
                        done={() => {
                          onConnected();
                          pop();
                          pop();
                        }}
                      />,
                    )
                  }
                />
                {actions}
              </ActionPanel>
            }
          />
        ))}
        {!busy && !targets.length ? (
          <List.Item
            title="No Forwarded Argo Bridges Found"
            subtitle="The server must run the new bridge and its port must be forwarded into this Mac's discovery range."
            icon={Icon.Info}
            actions={<ActionPanel>{actions}</ActionPanel>}
          />
        ) : null}
      </List.Section>
    </List>
  );
}
