import { useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
  showToast,
} from "@raycast/api";
import {
  Association,
  Entry,
  MacPassClient,
  localTransport,
  parsePort,
} from "./lib/protocol";

type Session = { client: MacPassClient; association: Association };

function storageKey(port: number, hash: string) {
  return `macpass-association:${port}:${hash}`;
}

export default function SearchEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [session, setSession] = useState<Session>();
  const [loading, setLoading] = useState(true);
  const [needsPairing, setNeedsPairing] = useState(false);
  const [message, setMessage] = useState("Connecting to MacPass…");
  const busy = useRef(false);
  const mounted = useRef(true);

  async function refresh(pair = false) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setEntries([]);
    setSession(undefined);
    setNeedsPairing(false);
    setMessage(
      pair
        ? "Approve the connection in MacPass. Use a name such as Raycast."
        : "Connecting to MacPass…",
    );
    let toast: Toast | undefined;
    try {
      const port = parsePort(getPreferenceValues<Preferences>().port);
      const client = new MacPassClient(localTransport(port));
      const hash = await client.databaseHash();
      const key = storageKey(port, hash);
      let association: Association | undefined;
      if (pair) {
        toast = await showToast({
          style: Toast.Style.Animated,
          title: "Approve the connection in MacPass",
          message: "Name it Raycast, then return here.",
        });
        association = await client.associate(hash);
        await LocalStorage.setItem(key, JSON.stringify(association));
      } else {
        const stored = await LocalStorage.getItem<string>(key);
        if (stored) association = JSON.parse(stored) as Association;
      }
      if (!mounted.current) return;
      if (!association) {
        setNeedsPairing(true);
        setMessage(
          "Unlock your database, then press Enter to connect. Approve the request in MacPass.",
        );
        return;
      }
      if (association.hash !== hash)
        throw new Error("The active database changed. Refresh and reconnect.");
      const results = await client.entries(association);
      if (!mounted.current) return;
      setSession({ client, association });
      setEntries(results);
      setMessage(
        "MacPassHTTP returned no entries. Entries must be in a group below the database root.",
      );
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "Connected to MacPass";
      }
    } catch (error) {
      if (!mounted.current) return;
      const description =
        error instanceof Error
          ? error.message
          : "Could not connect to MacPass.";
      setMessage(description);
      setNeedsPairing(true);
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = "Connection failed";
        toast.message = description;
      }
    } finally {
      busy.current = false;
      if (mounted.current) setLoading(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, []);

  async function useCredential(
    entry: Entry,
    field: "password" | "username",
    paste: boolean,
  ) {
    if (!session || busy.current) return;
    busy.current = true;
    setLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Fetching ${field}…`,
    });
    try {
      // Revalidate even for usernames, since the database may have been locked
      // or switched since this command loaded its search results.
      await session.client.validate(session.association);
      const value =
        field === "password"
          ? await session.client.password(session.association, entry)
          : entry.login;
      if (!mounted.current) return;
      await toast.hide();
      if (paste) {
        await Clipboard.paste(value);
      } else {
        await Clipboard.copy(value, { concealed: true });
        await closeMainWindow();
        await showHUD(
          `${field === "password" ? "Password" : "Username"} copied`,
        );
      }
    } catch (error) {
      setEntries([]);
      setSession(undefined);
      setNeedsPairing(true);
      const description =
        error instanceof Error
          ? error.message
          : "Could not retrieve the credential.";
      setMessage(description);
      toast.style = Toast.Style.Failure;
      toast.title = "Could not retrieve credential";
      toast.message = description;
    } finally {
      busy.current = false;
      if (mounted.current) setLoading(false);
    }
  }

  const connectionActions = (
    <ActionPanel.Section title="Connection">
      <Action
        title="Refresh Entries"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => refresh()}
      />
      <Action.Open title="Open MacPass" target="/Applications/MacPass.app" />
      <Action
        title="Reconnect Database"
        icon={Icon.Link}
        onAction={() => refresh(true)}
      />
      <Action
        title="Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search MacPass titles and usernames…"
    >
      <List.EmptyView
        icon={Icon.Lock}
        title={
          loading
            ? "Connecting to MacPass"
            : session
              ? "No Matching Entries"
              : "Connect to MacPass"
        }
        description={
          session && entries.length ? "Try another title or username." : message
        }
        actions={
          <ActionPanel>
            {needsPairing && !loading && (
              <Action
                title="Connect Database"
                icon={Icon.Link}
                onAction={() => refresh(true)}
              />
            )}
            {connectionActions}
          </ActionPanel>
        }
      />
      {entries.map((entry) => (
        <List.Item
          key={entry.uuid}
          id={entry.uuid}
          icon={Icon.Key}
          title={entry.name || "Untitled Entry"}
          subtitle={entry.login}
          keywords={[entry.login]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Credentials">
                <Action
                  title="Copy Password"
                  icon={Icon.Clipboard}
                  onAction={() => useCredential(entry, "password", false)}
                />
                <Action
                  title="Paste Password"
                  icon={Icon.TextCursor}
                  onAction={() => useCredential(entry, "password", true)}
                />
                <Action
                  title="Copy Username"
                  icon={Icon.Person}
                  shortcut={{ modifiers: ["cmd"], key: "u" }}
                  onAction={() => useCredential(entry, "username", false)}
                />
                <Action
                  title="Paste Username"
                  icon={Icon.TextCursor}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                  onAction={() => useCredential(entry, "username", true)}
                />
              </ActionPanel.Section>
              {connectionActions}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
