import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getConnections } from "./db";
import { ConnectionEntry, isBookmarkEntry, isHistoryEntry, isProtocolX } from "./types";
import { IsCyberduckInstalled } from "./utils";
import { getAvatarIcon, getFavicon } from "@raycast/utils";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [connections, setConnections] = useState<ConnectionEntry[]>([]);
  const [protocol, setProtocol] = useState<string>("all");

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
    <List
      searchBarPlaceholder="Search connections"
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Protocol" onChange={setProtocol}>
          <List.Dropdown.Item icon="icon.png" title={`All (${connections.length})`} value="all" />
          {[...new Set(connections.map((c) => c.Protocol))].map((protocol) => (
            <List.Dropdown.Item
              key={protocol}
              icon={getAvatarIcon(protocol)}
              title={`${protocol.toUpperCase()} (${
                connections.filter((entry) => isProtocolX(entry, protocol)).length
              })`}
              value={protocol}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Bookmarks">
        {connections
          .filter(isBookmarkEntry)
          .filter((bookmark) => isProtocolX(bookmark, protocol))
          .map((bookmark) => (
            <ListItem key={bookmark.UUID} entry={bookmark} />
          ))}
      </List.Section>
      <List.Section title="History">
        {connections
          .filter(isHistoryEntry)
          .filter((history) => isProtocolX(history, protocol))
          .map((history) => (
            <ListItem key={history.UUID} entry={history} />
          ))}
      </List.Section>
    </List>
  );
}

function ListItem(props: { entry: ConnectionEntry }) {
  const prot = props.entry.Protocol.toUpperCase();
  const name = props.entry.Nickname || props.entry.Hostname || "-";
  const { Hostname, Port, Protocol, Username } = props.entry;
  const accessories = [
    ...(Number.isFinite(Port) ? [{ icon: Icon.Plug, tag: Port.toString(), tooltip: `Port: ${Port}` }] : []),
    { icon: Icon.Person, text: Username, tooltip: `Username: ${Username}` },
  ];
  return (
    <List.Item
      icon={Hostname ? getFavicon(`https://${Hostname}`) : getAvatarIcon(Protocol)}
      title={name}
      subtitle={`${Hostname || "-"} - ${prot}`}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open icon="icon.png" title="Open in Cyberduck" target={props.entry.Path} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
