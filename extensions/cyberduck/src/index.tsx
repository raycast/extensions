import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getConnections } from "./db";
import { ConnectionEntry, isBookmarkEntry, isHistoryEntry } from "./types";
import { IsCyberduckInstalled } from "./utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [connections, setConnections] = useState<ConnectionEntry[]>([]);

  async function init() {
    const is_cyberduck_installed = await IsCyberduckInstalled();
    if (!is_cyberduck_installed) {
      setIsLoading(false);
      showToast({
        title: "Cyberduck is not installed",
        message: "Install it from: https://cyberduck.io",
        style: Toast.Style.Failure,
      });
      return;
    }
    getConnections()
      .then((connections) => setConnections(connections))
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    init();
  }, []);

  if (error) {
    showToast({ title: "Failed to load recent projects", message: error, style: Toast.Style.Failure });
  }
  return (
    <List searchBarPlaceholder="Search connections..." isLoading={isLoading}>
      <List.Section title="Bookmarks">
        {connections.filter(isBookmarkEntry).map((bookmark) => (
          <ListItem key={bookmark.UUID} entry={bookmark} />
        ))}
      </List.Section>
      <List.Section title="History">
        {connections.filter(isHistoryEntry).map((history) => (
          <ListItem key={history.UUID} entry={history} />
        ))}
      </List.Section>
    </List>
  );
}

function ListItem(props: { entry: ConnectionEntry }) {
  const prot = props.entry.Protocol.toUpperCase();
  const name = props.entry.Nickname || props.entry.Hostname || "-";
  return (
    <List.Item
      title={name}
      subtitle={`${props.entry.Hostname} - ${prot}`}
      accessoryTitle={props.entry.Username}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open title="Open in Cyberduck" target={props.entry.Path} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
