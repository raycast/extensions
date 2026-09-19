import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { useMemo, useState } from "react";

const execFileAsync = promisify(execFile);
const databasePath = `${homedir()}/Library/Application Support/com.devolutions.remotedesktopmanager/Connections.db`;
type Connection = {
  id: string;
  name: string;
  groupName: string;
  connectionType: number;
  isFolder: boolean;
  lastUsed: string | null;
};
function guidFromHex(hex: string): string {
  const value = hex.toLowerCase();
  const reverseBytes = (part: string) => part.match(/../g)!.reverse().join("");
  return `${reverseBytes(value.slice(0, 8))}-${reverseBytes(value.slice(8, 12))}-${reverseBytes(value.slice(12, 16))}-${value.slice(16, 20)}-${value.slice(20)}`;
}

async function loadConnections(): Promise<Connection[]> {
  // Type 25 records are folder nodes. Keep them to reconstruct the tree, but do not display them as connections.
  const query = `SELECT lower(hex(c.ID)) || char(9) || coalesce(c.Name, '') || char(9) || coalesce(c.GroupName, '') || char(9) || coalesce(c.ConnectionType, 0) || char(9) || coalesce((SELECT max(coalesce(l.StartDateTime, l.EndDateTime)) FROM ConnectionLog l WHERE l.ConnectionID = c.ID), '') FROM Connections c WHERE c.Name IS NOT NULL AND c.Name != '[Root]' ORDER BY c.GroupName, c.Name;`;
  const result = await execFileAsync("/usr/bin/sqlite3", [
    "-noheader",
    databasePath,
    query,
  ]);
  return result.stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [id, name, groupName, connectionType, lastUsed] = line.split("\t");
      return {
        id: guidFromHex(id),
        name,
        groupName,
        connectionType: Number(connectionType),
        isFolder: Number(connectionType) === 25,
        lastUsed: lastUsed || null,
      };
    });
}

function connectionUrl(connection: Connection): string {
  return `rdm://open?DataSource=00000000-0000-0000-0000-000000000000&Session=${connection.id}`;
}

function folderConnectionCount(
  folderName: string,
  connections: Connection[],
): number {
  const prefix = `${folderName}\\`;
  return connections.filter(
    (connection) =>
      !connection.isFolder &&
      (connection.groupName === folderName ||
        connection.groupName.startsWith(prefix)),
  ).length;
}

function connectionCountLabel(count: number): string {
  return `${count} connection${count === 1 ? "" : "s"}`;
}

function normalizeSearchValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function connectionSearchValue(connection: Connection): string {
  return normalizeSearchValue(`${connection.name}${connection.groupName}`);
}

function matchesConnectionSearch(
  connection: Connection,
  query: string,
): boolean {
  const normalizedQuery = normalizeSearchValue(query);
  const normalizedName = normalizeSearchValue(connection.name);
  const normalizedGroup = normalizeSearchValue(connection.groupName);
  if (!normalizedQuery) return true;
  if (connectionSearchValue(connection).includes(normalizedQuery)) return true;

  // Also support combined queries such as "mailstan" and "mailhd":
  // match the first part in the connection name and the second part in its folder path.
  for (let split = 2; split <= normalizedQuery.length - 2; split += 1) {
    const namePart = normalizedQuery.slice(0, split);
    const folderPart = normalizedQuery.slice(split);
    if (
      normalizedName.includes(namePart) &&
      normalizedGroup.includes(folderPart)
    )
      return true;
  }
  return false;
}

function lastUsedDate(connection: Connection): Date | null {
  if (!connection.lastUsed) return null;
  const isoValue = connection.lastUsed
    .replace(" ", "T")
    .replace(/\.(\d{3})\d*/, ".$1");
  const date = new Date(isoValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function lastUsedLabel(connection: Connection): string | null {
  const date = lastUsedDate(connection);
  if (!date) return null;
  const elapsedMinutes = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 60000),
  );
  if (elapsedMinutes < 60) return `${Math.max(1, elapsedMinutes)}m`;
  if (elapsedMinutes < 1440) return `${Math.floor(elapsedMinutes / 60)}h`;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
  }).format(date);
}

function lastUsedAccessory(connection: Connection) {
  const date = lastUsedDate(connection);
  const label = lastUsedLabel(connection);
  return date && label
    ? {
        tag: { value: label, color: Color.Yellow },
        icon: Icon.Clock,
        tooltip: `Last used: ${date.toLocaleString()}`,
      }
    : null;
}

function openConnection(connection: Connection) {
  return async () => {
    try {
      await execFileAsync("/usr/bin/open", [connectionUrl(connection)]);
      await showToast({
        style: Toast.Style.Success,
        title: `Opening ${connection.name}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not open connection",
        message: String(error),
      });
    }
  };
}

function FolderView({
  folderName,
  connections,
}: {
  folderName: string;
  connections: Connection[];
}) {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const prefix = `${folderName}\\`;
  const childFolders = [
    ...new Set(
      connections
        .flatMap((connection) =>
          connection.groupName ? [connection.groupName] : [],
        )
        .filter((groupName) => groupName.startsWith(prefix))
        .map((groupName) => {
          const separator = groupName.indexOf("\\", prefix.length);
          return separator === -1 ? groupName : groupName.slice(0, separator);
        }),
    ),
  ]
    .filter((childFolder) => childFolder !== folderName)
    .sort();
  const directConnections = connections.filter(
    (connection) => !connection.isFolder && connection.groupName === folderName,
  );
  const normalizedSearch = searchText.trim().toLowerCase();
  const searching = normalizedSearch.length > 0;
  const folderConnections = connections.filter(
    (connection) =>
      !connection.isFolder &&
      (connection.groupName === folderName ||
        connection.groupName.startsWith(prefix)),
  );
  const searchConnections = folderConnections.filter((connection) =>
    matchesConnectionSearch(connection, normalizedSearch),
  );
  const visibleChildFolders = searching
    ? childFolders.filter((childFolder) =>
        childFolder.toLowerCase().includes(normalizedSearch),
      )
    : childFolders;
  const visibleConnections = searching ? searchConnections : directConnections;

  return (
    <List
      searchBarPlaceholder={`Search in ${folderName}`}
      onSearchTextChange={setSearchText}
    >
      {visibleChildFolders.map((childFolder) => (
        <List.Item
          key={`folder:${childFolder}`}
          icon={{ source: Icon.Folder, tintColor: Color.Orange }}
          title={childFolder.split("\\").pop() ?? childFolder}
          subtitle={childFolder}
          accessories={[
            {
              text: connectionCountLabel(
                folderConnectionCount(childFolder, connections),
              ),
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Open Folder"
                icon={Icon.ArrowRight}
                onAction={() =>
                  push(
                    <FolderView
                      folderName={childFolder}
                      connections={connections}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      ))}
      {visibleConnections.map((connection) => (
        <List.Item
          key={connection.id}
          icon={{ source: Icon.Network, tintColor: Color.Blue }}
          title={connection.name}
          subtitle={connection.groupName}
          accessories={
            lastUsedAccessory(connection)
              ? [lastUsedAccessory(connection)!]
              : undefined
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Connection"
                icon={Icon.ArrowRight}
                onAction={openConnection(connection)}
              />
              <Action.CopyToClipboard
                title="Copy RDM Link"
                content={connectionUrl(connection)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function SearchConnections() {
  const { data, isLoading, revalidate } = usePromise(loadConnections);
  const { push } = useNavigation();
  const { showFolders, showRecent, showRecentAtStart } =
    getPreferenceValues<Preferences.SearchConnections>();
  const [searchText, setSearchText] = useState("");
  const connections = data ?? [];
  const allFolders = useMemo(
    () =>
      [
        ...new Set(
          connections.flatMap((connection) =>
            connection.groupName ? [connection.groupName] : [],
          ),
        ),
      ].sort(),
    [connections],
  );
  const normalizedSearch = searchText.trim().toLowerCase();
  const searching = normalizedSearch.length > 0;
  const visibleFolders = searching
    ? allFolders.filter((folder) =>
        folder.toLowerCase().includes(normalizedSearch),
      )
    : allFolders.filter((folder) => !folder.includes("\\"));
  const visibleConnections = connections.filter((connection) => {
    if (connection.isFolder) return false;
    if (searching) {
      return matchesConnectionSearch(connection, normalizedSearch);
    }
    return !showFolders || connection.groupName === "";
  });
  const recentConnections = connections
    .filter((connection) => !connection.isFolder && lastUsedDate(connection))
    .sort((a, b) => lastUsedDate(b)!.getTime() - lastUsedDate(a)!.getTime())
    .slice(0, 8);
  const recentIds = new Set(
    recentConnections.map((connection) => connection.id),
  );
  const regularConnections = searching
    ? visibleConnections
    : showRecent
      ? visibleConnections.filter((connection) => !recentIds.has(connection.id))
      : visibleConnections;

  const recentSection =
    !searching && showRecent && recentConnections.length > 0 ? (
      <List.Section title="Recent">
        {recentConnections.map((connection) => (
          <List.Item
            key={`recent:${connection.id}`}
            icon={{ source: Icon.Network, tintColor: Color.Blue }}
            title={connection.name}
            subtitle={connection.groupName || "Root"}
            accessories={
              lastUsedAccessory(connection)
                ? [lastUsedAccessory(connection)!]
                : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title="Open Connection"
                  icon={Icon.ArrowRight}
                  onAction={openConnection(connection)}
                />
                <Action.CopyToClipboard
                  title="Copy RDM Link"
                  content={connectionUrl(connection)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    ) : null;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search RDM connections"
      throttle
      onSearchTextChange={setSearchText}
    >
      {showRecentAtStart && recentSection}
      {showFolders &&
        visibleFolders.map((folder) => (
          <List.Item
            key={`folder:${folder}`}
            icon={{ source: Icon.Folder, tintColor: Color.Orange }}
            title={folder.split("\\").pop() ?? folder}
            subtitle={folder}
            accessories={[
              {
                text: connectionCountLabel(
                  folderConnectionCount(folder, connections),
                ),
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open Folder"
                  icon={Icon.ArrowRight}
                  onAction={() =>
                    push(
                      <FolderView
                        folderName={folder}
                        connections={connections}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      {regularConnections.map((connection) => (
        <List.Item
          key={connection.id}
          icon={{ source: Icon.Network, tintColor: Color.Blue }}
          title={connection.name}
          subtitle={connection.groupName || "Root"}
          accessories={
            lastUsedAccessory(connection)
              ? [lastUsedAccessory(connection)!]
              : undefined
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Connection"
                icon={Icon.ArrowRight}
                onAction={openConnection(connection)}
              />
              <Action.CopyToClipboard
                title="Copy RDM Link"
                content={connectionUrl(connection)}
              />
            </ActionPanel>
          }
        />
      ))}
      {!showRecentAtStart && recentSection}
      <List.Item
        key="refresh"
        title="Refresh Connections"
        icon={{ source: Icon.Repeat, tintColor: Color.Green }}
        actions={
          <ActionPanel>
            <Action
              title="Refresh Connections"
              icon={Icon.Repeat}
              onAction={revalidate}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
