import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  environment,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import EditConnectionForm, { DuplicateConnectionForm } from "./edit-connection";
import {
  activate1Remote,
  connect,
  connectTag,
  Connection,
  deleteConnection,
  getIconPath,
  loadConnections,
} from "./lib/one-remote";

const ALL_TAGS = "__all__";

function protocolColor(protocol: string): Color {
  switch (protocol.toUpperCase()) {
    case "RDP":
      return Color.Blue;
    case "SSH":
      return Color.Green;
    case "VNC":
      return Color.Purple;
    case "SFTP":
    case "FTP":
      return Color.Orange;
    default:
      return Color.SecondaryText;
  }
}

function hostLabel(connection: Connection) {
  return connection.port ? `${connection.address}:${connection.port}` : connection.address;
}

function detailMarkdown(connection: Connection) {
  return connection.note ? connection.note : `_No note_`;
}

export default function Command() {
  const { showNoteDetail } = getPreferenceValues<Preferences>();
  const [isShowingDetail, setIsShowingDetail] = useState(showNoteDetail ?? false);
  const [tagFilter, setTagFilter] = useState(ALL_TAGS);
  const {
    data = [],
    isLoading,
    revalidate,
    mutate,
  } = useCachedPromise(async () => loadConnections(), [], {
    onError: (error) => {
      showFailureToast(error, { title: "Could not read the 1Remote database" });
    },
  });

  const allTags = useMemo(
    () =>
      [...new Set(data.flatMap((c) => c.tags))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    [data],
  );
  const visible = tagFilter === ALL_TAGS ? data : data.filter((c) => c.tags.includes(tagFilter));

  async function handleConnect(connection: Connection) {
    try {
      connect(connection);
      await showHUD(`Connecting to ${connection.name}`);
    } catch (error) {
      await showFailureToast(error, { title: "Could not start 1Remote" });
    }
  }

  async function handleConnectTag(tag: string) {
    try {
      connectTag(tag);
      await showHUD(`Connecting all connections tagged #${tag}`);
    } catch (error) {
      await showFailureToast(error, { title: "Could not start 1Remote" });
    }
  }

  async function handleDelete(connection: Connection) {
    const confirmed = await confirmAlert({
      title: `Delete "${connection.name}"?`,
      message: "The connection is removed from the 1Remote database. This cannot be undone.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await mutate(Promise.resolve(deleteConnection(connection.id)), {
        optimisticUpdate: (current = []) => current.filter((c) => c.id !== connection.id),
      });
      await showToast({ style: Toast.Style.Success, title: "Connection deleted" });
    } catch (error) {
      await showFailureToast(error, { title: "Could not delete connection" });
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search connections by name, address, user or tag"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by tag" value={tagFilter} onChange={setTagFilter}>
          <List.Dropdown.Item title="All Tags" value={ALL_TAGS} icon={Icon.Tag} />
          {allTags.map((tag) => (
            <List.Dropdown.Item key={tag} title={`#${tag}`} value={tag} />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading && (
        <List.EmptyView
          icon={Icon.Monitor}
          title="No connections found"
          actions={
            <ActionPanel>
              <Action title="Open 1Remote" icon={Icon.AppWindow} onAction={() => activate1Remote()} />
            </ActionPanel>
          }
        />
      )}
      {visible.map((connection) => {
        const iconPath = getIconPath(connection, environment.supportPath);
        return (
          <List.Item
            key={connection.id}
            icon={
              iconPath ? { source: iconPath } : { source: Icon.Monitor, tintColor: protocolColor(connection.protocol) }
            }
            title={connection.name}
            subtitle={isShowingDetail ? undefined : hostLabel(connection)}
            keywords={[connection.address, connection.userName, connection.protocol, ...connection.tags]}
            accessories={
              isShowingDetail
                ? undefined
                : [
                    ...connection.tags.map((tag) => ({ tag: `#${tag}` })),
                    { tag: { value: connection.protocol, color: protocolColor(connection.protocol) } },
                    ...(connection.lastConnected
                      ? [{ date: new Date(connection.lastConnected), tooltip: "Last connected" }]
                      : []),
                  ]
            }
            detail={
              <List.Item.Detail
                markdown={detailMarkdown(connection)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.TagList title="Protocol">
                      <List.Item.Detail.Metadata.TagList.Item
                        text={connection.protocol}
                        color={protocolColor(connection.protocol)}
                      />
                    </List.Item.Detail.Metadata.TagList>
                    <List.Item.Detail.Metadata.Label title="Address" text={hostLabel(connection) || "—"} />
                    <List.Item.Detail.Metadata.Label title="User" text={connection.userName || "—"} />
                    {typeof connection.json.Domain === "string" && connection.json.Domain && (
                      <List.Item.Detail.Metadata.Label title="Domain" text={connection.json.Domain} />
                    )}
                    {connection.tags.length > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {connection.tags.map((tag) => (
                          <List.Item.Detail.Metadata.TagList.Item key={tag} text={`#${tag}`} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    {connection.lastConnected && (
                      <List.Item.Detail.Metadata.Label
                        title="Last Connected"
                        text={new Date(connection.lastConnected).toLocaleString()}
                      />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Connect" icon={Icon.Plug} onAction={() => handleConnect(connection)} />
                  <Action.Push
                    title="Edit Connection"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    target={<EditConnectionForm connection={connection} onSaved={revalidate} />}
                  />
                  <Action
                    title={isShowingDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    shortcut={{ Windows: { modifiers: ["ctrl"], key: "d" }, macOS: { modifiers: ["cmd"], key: "d" } }}
                    onAction={() => setIsShowingDetail((value) => !value)}
                  />
                </ActionPanel.Section>
                {connection.tags.length > 0 && (
                  <ActionPanel.Section title="Connect by Tag">
                    {connection.tags.map((tag) => (
                      <Action
                        key={tag}
                        title={`Connect All #${tag}`}
                        icon={Icon.Tag}
                        onAction={() => handleConnectTag(tag)}
                      />
                    ))}
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Address"
                    content={hostLabel(connection)}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  {connection.userName && (
                    <Action.CopyToClipboard
                      title="Copy User Name"
                      content={connection.userName}
                      shortcut={{
                        Windows: { modifiers: ["ctrl", "shift"], key: "u" },
                        macOS: { modifiers: ["cmd", "shift"], key: "u" },
                      }}
                    />
                  )}
                  <Action.Push
                    title="Duplicate Connection"
                    icon={Icon.CopyClipboard}
                    shortcut={Keyboard.Shortcut.Common.Duplicate}
                    target={<DuplicateConnectionForm connection={connection} onSaved={revalidate} />}
                  />
                  <Action title="Open 1Remote" icon={Icon.AppWindow} onAction={() => activate1Remote()} />
                  <Action
                    title="Reload Connections"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Delete Connection"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => handleDelete(connection)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
