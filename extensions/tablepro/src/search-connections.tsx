import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Connection, TableProNotInstalledError } from "./lib/types";
import { databaseTypeLabel, loadConnections } from "./lib/connections";
import { tableProInstalled } from "./lib/paths";
import { openConnectionDeeplink } from "./lib/deeplink";
import { ScenarioEmptyView } from "./lib/empty-state";
import { classifyError } from "./lib/errors";
import { connectionIcon } from "./lib/driver-icons";

export default function SearchConnections() {
  const {
    data: connections,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async () => {
      if (!tableProInstalled()) throw new TableProNotInstalledError();
      return loadConnections();
    },
    [],
    { keepPreviousData: true },
  );

  if (error) {
    return (
      <List>
        <ScenarioEmptyView scenario={classifyError(error)} />
      </List>
    );
  }

  const grouped = groupByType(connections ?? []);
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) =>
    databaseTypeLabel(a).localeCompare(databaseTypeLabel(b)),
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter connections by name, host, or type"
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    >
      {!isLoading && connections !== undefined && connections.length === 0 ? (
        <List.EmptyView
          icon={Icon.Plug}
          title="No connections yet"
          description="Add a connection in TablePro to see it here."
        />
      ) : null}
      {sortedGroups.map(([type, items]) => (
        <List.Section
          key={type}
          title={databaseTypeLabel(type)}
          subtitle={pluralize(items.length, "connection", "connections")}
        >
          {items.map((connection) => (
            <ConnectionRow
              key={connection.id}
              connection={connection}
              onRefresh={revalidate}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function ConnectionRow({
  connection,
  onRefresh,
}: {
  connection: Connection;
  onRefresh: () => void;
}) {
  const subtitle = formatSubtitle(connection);
  return (
    <List.Item
      title={connection.name}
      subtitle={subtitle}
      accessories={[{ tag: databaseTypeLabel(connection.type) }]}
      icon={connectionIcon(connection.type)}
      actions={
        <ActionPanel>
          <Action
            title="Open in TablePro"
            icon={Icon.AppWindow}
            onAction={async () => {
              try {
                await openConnectionDeeplink(connection.id);
              } catch (err) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Could not open connection",
                  message: err instanceof Error ? err.message : String(err),
                });
              }
            }}
          />
          <Action
            title="Copy Deep Link"
            icon={Icon.Link}
            shortcut={{ modifiers: ["cmd"], key: "." }}
            onAction={async () => {
              await Clipboard.copy(`tablepro://connect/${connection.id}`);
              await showToast({
                style: Toast.Style.Success,
                title: "Deep link copied",
              });
            }}
          />
          <Action.CopyToClipboard
            title="Copy Connection ID"
            content={connection.id}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

function formatSubtitle(connection: Connection): string {
  if (connection.host) {
    if (connection.port) return `${connection.host}:${connection.port}`;
    return connection.host;
  }
  if (connection.database) return connection.database;
  return "";
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function groupByType(list: Connection[]): Record<string, Connection[]> {
  const map: Record<string, Connection[]> = {};
  for (const conn of list) {
    const bucket = map[conn.type] ?? [];
    bucket.push(conn);
    map[conn.type] = bucket;
  }
  for (const bucket of Object.values(map)) {
    bucket.sort((a, b) => a.name.localeCompare(b.name));
  }
  return map;
}
