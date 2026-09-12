import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { Connection, TableInfo } from "./lib/types";
import { databaseTypeLabel, loadConnections } from "./lib/connections";
import { listTables, getTableDDL } from "./lib/mcp";
import { tableProInstalled } from "./lib/paths";
import { TableProNotInstalledError } from "./lib/types";
import { ScenarioEmptyView } from "./lib/empty-state";
import { classifyError } from "./lib/errors";
import { openTableDeeplink } from "./lib/deeplink";
import { formatRowCount } from "./lib/format";
import { connectionIcon } from "./lib/driver-icons";

interface Props {
  connection?: Connection;
  database?: string;
  schema?: string;
}

type SortMode = "name" | "rowCount";

export default function SearchTables(props: Props) {
  if (!props.connection) {
    return <ConnectionPicker />;
  }
  return (
    <TablesList
      connection={props.connection}
      database={props.database}
      schema={props.schema}
    />
  );
}

function ConnectionPicker() {
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
          description="Add a connection in TablePro to browse its tables."
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
                title="Browse Tables"
                icon={Icon.List}
                target={<TablesList connection={connection} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function TablesList({
  connection,
  database,
  schema,
}: {
  connection: Connection;
  database?: string;
  schema?: string;
}) {
  const abortable = useRef<AbortController | null>(null);
  const {
    data: tables,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    (id: string, db: string | undefined, sc: string | undefined) =>
      listTables(id, {
        database: db,
        schema: sc,
        signal: abortable.current?.signal,
      }),
    [connection.id, database, schema],
    { keepPreviousData: true, abortable },
  );
  const [sortMode, setSortMode] = useState<SortMode>("name");
  const sortedTables = useMemo(
    () => sortTables(tables ?? [], sortMode),
    [tables, sortMode],
  );

  useEffect(() => {
    if (!error) return;
    if (tables === undefined) return;
    const scenario = classifyError(error);
    if (scenario.kind !== "other") return;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not refresh tables",
        message: scenario.message,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [error, tables]);

  if (error && tables === undefined) {
    return (
      <List navigationTitle={connection.name}>
        <ScenarioEmptyView scenario={classifyError(error)} />
      </List>
    );
  }

  const navTitle = [connection.name, database, schema]
    .filter(Boolean)
    .join(" / ");

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navTitle}
      searchBarPlaceholder="Filter tables"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort"
          value={sortMode}
          onChange={(value) => setSortMode(value as SortMode)}
        >
          <List.Dropdown.Item title="Sort by Name" value="name" />
          <List.Dropdown.Item title="Sort by Row Count" value="rowCount" />
        </List.Dropdown>
      }
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
      {!isLoading && tables !== undefined && tables.length === 0 ? (
        <List.EmptyView
          icon={Icon.List}
          title="No tables"
          description="This connection has no tables in the selected scope."
        />
      ) : null}
      {sortedTables.map((table) => (
        <List.Item
          key={`${table.schema ?? ""}.${table.name}`}
          title={table.name}
          subtitle={table.schema}
          accessories={tableAccessories(table)}
          icon={Icon.List}
          actions={
            <ActionPanel>
              <Action
                title="Open in TablePro"
                icon={Icon.AppWindow}
                onAction={async () => {
                  await openTableDeeplink(
                    connection.id,
                    table.name,
                    database,
                    table.schema ?? schema,
                  );
                }}
              />
              <Action
                title="Copy DDL"
                icon={Icon.Code}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={async () => {
                  try {
                    const result = await getTableDDL(
                      connection.id,
                      table.name,
                      {
                        schema: table.schema ?? schema,
                      },
                    );
                    await Clipboard.copy(result.ddl);
                    await showToast({
                      style: Toast.Style.Success,
                      title: "DDL copied",
                    });
                  } catch (err) {
                    await showFailureToast(err, {
                      title: "Could not fetch DDL",
                    });
                  }
                }}
              />
              <Action.CopyToClipboard
                title="Copy Table Name"
                content={table.name}
                shortcut={{
                  modifiers: ["cmd", "shift"],
                  key: "c",
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function sortTables(list: TableInfo[], mode: SortMode): TableInfo[] {
  const copy = [...list];
  if (mode === "rowCount") {
    copy.sort((a, b) => (b.rowCount ?? -1) - (a.rowCount ?? -1));
  } else {
    copy.sort((a, b) => a.name.localeCompare(b.name));
  }
  return copy;
}

function tableAccessories(table: TableInfo): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (table.type && table.type.toLowerCase() !== "table") {
    accessories.push({ tag: table.type });
  }
  if (table.rowCount !== undefined) {
    accessories.push({
      text: `${formatRowCount(table.rowCount)} rows`,
      tooltip: `${table.rowCount.toLocaleString()} rows`,
    });
  }
  return accessories;
}
