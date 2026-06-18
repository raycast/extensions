import { List, ActionPanel, Action, Icon, showToast, Toast, LocalStorage, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { useState, useEffect } from "react";

interface Connection {
  id: string;
  name: string;
  description: string;
}

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function fetchConnections(): Promise<Connection[]> {
  console.debug("fetchConnections: starting");
  const isRunning = await runAppleScript(`return application "Royal TSX" is running`);
  console.debug(`fetchConnections: Royal TSX is running=${isRunning.trim()}`);
  if (isRunning.trim() !== "true") {
    throw new Error("Royal TSX must be running for this extension to work.");
  }
  const script = `
    tell application "Royal TSX"
      set conIds to id of every connection
      set conNames to name of every connection
      set conDescriptions to description of every connection
      set conCount to count of conIds
      set fieldSep to ASCII character 31
      set recSep to ASCII character 30
      set output to ""
      repeat with i from 1 to conCount
        if i > 1 then set output to output & recSep
        set output to output & (item i of conIds) & fieldSep & (item i of conNames) & fieldSep & (item i of conDescriptions)
      end repeat
      return output
    end tell
  `;
  const result = await runAppleScript(script);
  console.debug(`fetchConnections: raw AppleScript result length=${result?.length ?? 0}`);
  if (!result || result.trim() === "") {
    console.debug("fetchConnections: empty result, returning []");
    return [];
  }
  const connections = result
    .trim()
    .split("\u001E")
    .map((record) => {
      const parts = record.split("\u001F");
      return {
        id: parts[0] ?? "",
        name: parts[1] ?? "",
        description: parts[2] ?? "",
      };
    })
    .filter((c) => c.id !== "");
  console.debug(`fetchConnections: parsed ${connections.length} connection(s)`);
  return connections;
}

async function connectToConnection(id: string): Promise<void> {
  console.debug(`connectToConnection: id=${id}`);
  const safeId = escapeAppleScriptString(id);
  await runAppleScript(`
    tell application "Royal TSX"
      activate
      connect "${safeId}"
    end tell
  `);
}

async function connectAdHoc(hostname: string): Promise<void> {
  console.debug(`connectAdHoc: hostname=${hostname}`);
  const safeHostname = escapeAppleScriptString(hostname);
  await runAppleScript(`
    tell application "Royal TSX"
      activate
      adhoc "${safeHostname}"
    end tell
  `);
}

function filterConnections(connections: Connection[], searchText: string): Connection[] {
  const normalized = searchText.trim().replace(/\s+/g, " ");
  if (!normalized) return connections;
  const words = normalized.toLowerCase().split(" ");
  return connections.filter((c) => words.every((word) => c.name.toLowerCase().includes(word)));
}

export default function Command() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    fetchConnections()
      .then((conns) => {
        console.debug(`Command: fetched ${conns.length} connection(s), sorting`);
        const sorted = [...conns].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
        setConnections(sorted);
      })
      .catch((err) => {
        console.error("Command: fetchConnections failed", err);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    LocalStorage.getItem<string>("recent-connections").then((value) => {
      if (value) {
        try {
          const parsed = JSON.parse(value);
          const validated = Array.isArray(parsed) && parsed.every((x) => typeof x === "string") ? parsed : [];
          console.debug(`Command: loaded ${validated.length} recent connection id(s) from LocalStorage`);
          setRecentIds(validated);
        } catch (err) {
          console.error("Command: failed to parse recent-connections from LocalStorage", err);
          setRecentIds([]);
        }
      } else {
        console.debug("Command: no recent-connections found in LocalStorage");
      }
    });
  }, []);

  function saveRecentIds(ids: string[]) {
    LocalStorage.setItem("recent-connections", JSON.stringify(ids));
  }

  function addToRecent(id: string) {
    console.debug(`addToRecent: id=${id}`);
    const updated = [id, ...recentIds.filter((r) => r !== id)].slice(0, 10);
    setRecentIds(updated);
    saveRecentIds(updated);
  }

  const recentConnections = recentIds
    .map((id) => connections.find((c) => c.id === id))
    .filter((c): c is Connection => c !== undefined);

  const remainingConnections = connections.filter((c) => !recentIds.includes(c.id));

  const filteredRecent = filterConnections(recentConnections, searchText);
  const filteredRemaining = filterConnections(remainingConnections, searchText);
  const showAdHoc = filteredRecent.length === 0 && filteredRemaining.length === 0 && searchText.trim().length > 0;

  async function handleConnect(id: string) {
    console.debug(`handleConnect: id=${id}`);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Connecting…" });
      await connectToConnection(id);
      console.debug(`handleConnect: successfully connected id=${id}`);
      addToRecent(id);
      await closeMainWindow();
    } catch (err) {
      console.error(`handleConnect: failed for id=${id}`, err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async function handleAdHoc(hostname: string) {
    console.debug(`handleAdHoc: hostname=${hostname}`);
    try {
      await showToast({ style: Toast.Style.Animated, title: "Connecting…" });
      await connectAdHoc(hostname);
      console.debug(`handleAdHoc: successfully connected hostname=${hostname}`);
      await closeMainWindow();
    } catch (err) {
      console.error(`handleAdHoc: failed for hostname=${hostname}`, err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection failed",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title={error} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search connections…"
    >
      {filteredRecent.length > 0 && (
        <List.Section title="Recent">
          {filteredRecent.map((c) => (
            <List.Item
              key={c.id}
              icon={Icon.Play}
              title={c.name}
              subtitle={c.description}
              actions={
                <ActionPanel>
                  <Action title="Connect" onAction={() => handleConnect(c.id)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {filteredRemaining.length > 0 && (
        <List.Section title="All Connections">
          {filteredRemaining.map((c) => (
            <List.Item
              key={c.id}
              icon={Icon.Play}
              title={c.name}
              subtitle={c.description}
              actions={
                <ActionPanel>
                  <Action title="Connection List" onAction={() => handleConnect(c.id)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {showAdHoc && (
        <List.Item
          key="adhoc"
          icon={Icon.Globe}
          title="Ad Hoc Connection"
          subtitle={searchText.trim()}
          actions={
            <ActionPanel>
              <Action title="Connection List" onAction={() => handleAdHoc(searchText.trim())} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
