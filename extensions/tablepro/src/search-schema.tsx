import {
  Action,
  ActionPanel,
  Icon,
  LaunchType,
  List,
  launchCommand,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef } from "react";
import { Connection } from "./lib/types";
import { databaseTypeLabel, loadConnections } from "./lib/connections";
import { listDatabases, listSchemas } from "./lib/mcp";
import { tableProInstalled } from "./lib/paths";
import { TableProNotInstalledError } from "./lib/types";
import { ScenarioEmptyView } from "./lib/empty-state";
import { classifyError } from "./lib/errors";
import SearchTablesView from "./search-tables";
import { connectionIcon } from "./lib/driver-icons";

export default function SearchSchema() {
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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Pick a connection"
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
          description="Add a connection in TablePro to browse its schema."
        />
      ) : null}
      {(connections ?? []).map((connection) => (
        <List.Item
          key={connection.id}
          title={connection.name}
          subtitle={connection.host}
          accessories={[{ tag: databaseTypeLabel(connection.type) }]}
          icon={connectionIcon(connection.type)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Browse Schema"
                icon={Icon.Folder}
                target={<DatabasesView connection={connection} />}
              />
              <Action.Push
                title="Browse Tables"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                target={<SearchTablesView connection={connection} />}
              />
              <Action
                title="Pair with TablePro"
                icon={Icon.Key}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={() =>
                  launchCommand({
                    name: "pair",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function DatabasesView({ connection }: { connection: Connection }) {
  const abortable = useRef<AbortController | null>(null);
  const {
    data: databases,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    (id: string) => listDatabases(id, { signal: abortable.current?.signal }),
    [connection.id],
    { keepPreviousData: true, abortable },
  );

  if (error) {
    return (
      <List navigationTitle={connection.name}>
        <ScenarioEmptyView scenario={classifyError(error)} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={connection.name}
      searchBarPlaceholder="Filter databases"
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
      {!isLoading && databases !== undefined && databases.length === 0 ? (
        <List.EmptyView
          icon={Icon.HardDrive}
          title="No databases"
          description="This connection has no databases to browse."
        />
      ) : null}
      {(databases ?? []).map((db) => (
        <List.Item
          key={db.name}
          title={db.name}
          icon={connectionIcon(connection.type)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Schemas"
                icon={Icon.Folder}
                target={
                  <SchemasView connection={connection} database={db.name} />
                }
              />
              <Action.Push
                title="Browse Tables"
                icon={Icon.List}
                target={
                  <SearchTablesView
                    connection={connection}
                    database={db.name}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SchemasView({
  connection,
  database,
}: {
  connection: Connection;
  database: string;
}) {
  const abortable = useRef<AbortController | null>(null);
  const {
    data: schemas,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    (id: string, db: string) =>
      listSchemas(id, { database: db, signal: abortable.current?.signal }),
    [connection.id, database],
    { keepPreviousData: true, abortable },
  );

  if (error) {
    return (
      <List navigationTitle={`${connection.name} / ${database}`}>
        <ScenarioEmptyView scenario={classifyError(error)} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${connection.name} / ${database}`}
      searchBarPlaceholder="Filter schemas"
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
      {!isLoading && schemas !== undefined && schemas.length === 0 ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="No schemas"
          description="This database has no schemas to browse."
        />
      ) : null}
      {(schemas ?? []).map((schema) => (
        <List.Item
          key={schema.name}
          title={schema.name}
          icon={Icon.Folder}
          actions={
            <ActionPanel>
              <Action.Push
                title="Browse Tables"
                icon={Icon.List}
                target={
                  <SearchTablesView
                    connection={connection}
                    database={database}
                    schema={schema.name}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
