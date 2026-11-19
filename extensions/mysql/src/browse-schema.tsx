import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  escapeId,
  listColumns,
  listDatabases,
  listForeignKeys,
  listTables,
  showCreateTable,
  type ForeignKey,
} from "./lib/client";
import { connectionFromPreferences, listConnections, type Connection } from "./lib/connections";
import { ResultView } from "./views/result-view";
import { NoConnection } from "./views/no-connection";
import { useState } from "react";

/** Shown in place of the "nothing here" empty view when a load actually failed, with the real error + Retry. */
function LoadError({ title, error, onRetry }: { title: string; error: Error; onRetry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={title}
      description={error.message}
      actions={
        <ActionPanel>
          <Action title="Retry" icon={Icon.ArrowClockwise} onAction={onRetry} />
        </ActionPanel>
      }
    />
  );
}

export default function BrowseSchema() {
  const { push } = useNavigation();
  const [connectionId, setConnectionId] = useState<string>();

  const { data: connections, isLoading: loadingConnections } = usePromise(async () => {
    const saved = await listConnections();
    if (saved.length > 0) return saved;
    const fallback = connectionFromPreferences();
    return fallback ? [fallback] : [];
  });

  const connection =
    connections?.find((c) => c.id === connectionId) ?? connections?.find((c) => c.isDefault) ?? connections?.[0];

  const {
    data: databases,
    isLoading: loadingDatabases,
    error: databasesError,
    revalidate: reloadDatabases,
  } = usePromise(async (conn?: Connection) => (conn ? listDatabases(conn) : []), [connection]);

  if (!loadingConnections && (!connections || connections.length === 0)) {
    return <NoConnection />;
  }

  return (
    <List
      isLoading={loadingConnections || loadingDatabases}
      searchBarPlaceholder="Filter databases…"
      searchBarAccessory={
        <List.Dropdown tooltip="Connection" value={connection?.id} onChange={setConnectionId}>
          {(connections ?? []).map((c) => (
            <List.Dropdown.Item key={c.id} value={c.id} title={c.name} />
          ))}
        </List.Dropdown>
      }
    >
      {databasesError ? (
        <LoadError title="Failed to load databases" error={databasesError} onRetry={reloadDatabases} />
      ) : (
        <List.EmptyView title="No databases" />
      )}
      {(databases ?? []).map((database) => (
        <List.Item
          key={database}
          icon={Icon.Coin}
          title={database}
          actions={
            <ActionPanel>
              {connection && (
                <Action
                  title="Browse Tables"
                  icon={Icon.List}
                  onAction={() => push(<Tables connection={connection} database={database} />)}
                />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Tables({ connection, database }: { connection: Connection; database: string }) {
  const { push } = useNavigation();
  const { data: tables, isLoading, error, revalidate } = usePromise(() => listTables(connection, database), []);

  return (
    <List isLoading={isLoading} navigationTitle={database} searchBarPlaceholder="Filter tables…">
      {error ? (
        <LoadError title="Failed to load tables" error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView title="No tables" />
      )}
      {(tables ?? []).map((table) => (
        <List.Item
          key={table}
          icon={Icon.List}
          title={table}
          actions={
            <ActionPanel>
              <Action
                title="Show Columns"
                icon={Icon.Sidebar}
                onAction={() => push(<Columns connection={connection} database={database} table={table} />)}
              />
              <Action
                title="Select Top 100 Rows"
                icon={Icon.Bolt}
                onAction={() =>
                  push(
                    <ResultView
                      connection={connection}
                      sql={`SELECT * FROM ${escapeId(database)}.${escapeId(table)} LIMIT 100`}
                    />,
                  )
                }
              />
              <Action
                title="Show Create Statement"
                icon={Icon.Code}
                onAction={() => push(<CreateStatement connection={connection} database={database} table={table} />)}
              />
              <Action
                title="Show Relationships"
                icon={Icon.Link}
                onAction={() => push(<Relationships connection={connection} database={database} table={table} />)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Columns({ connection, database, table }: { connection: Connection; database: string; table: string }) {
  const {
    data: columns,
    isLoading,
    error,
    revalidate,
  } = usePromise(() => listColumns(connection, database, table), []);

  return (
    <List isLoading={isLoading} navigationTitle={`${database}.${table}`} searchBarPlaceholder="Filter columns…">
      {error ? (
        <LoadError title="Failed to load columns" error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView title="No columns" />
      )}
      {(columns ?? []).map((column) => (
        <List.Item
          key={column.field}
          icon={column.key === "PRI" ? { source: Icon.Key, tintColor: undefined } : Icon.Dot}
          title={column.field}
          subtitle={column.type}
          accessories={[
            ...(column.key ? [{ tag: column.key }] : []),
            { text: column.nullable === "YES" ? "nullable" : "not null" },
          ]}
        />
      ))}
    </List>
  );
}

function CreateStatement({ connection, database, table }: { connection: Connection; database: string; table: string }) {
  const { data, isLoading, error, revalidate } = usePromise(() => showCreateTable(connection, database, table), []);
  const ddl = data ?? "";
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${database}.${table}`}
      markdown={error ? `# Failed to load\n\n${error.message}` : "```sql\n" + ddl + "\n```"}
      actions={
        <ActionPanel>
          {error ? (
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
          ) : (
            <Action.CopyToClipboard title="Copy Create Statement" content={ddl} />
          )}
        </ActionPanel>
      }
    />
  );
}

function buildMermaid(foreignKeys: ForeignKey[]): string {
  const seen = new Set<string>();
  const lines = ["erDiagram"];
  for (const fk of foreignKeys) {
    const line = `  "${fk.fromTable}" }o--|| "${fk.toTable}" : "${fk.fromColumn}"`;
    if (!seen.has(line)) {
      seen.add(line);
      lines.push(line);
    }
  }
  return lines.join("\n");
}

function Relationships({ connection, database, table }: { connection: Connection; database: string; table: string }) {
  const { data, isLoading, error, revalidate } = usePromise(() => listForeignKeys(connection, database, table), []);
  const outgoing = data?.outgoing ?? [];
  const incoming = data?.incoming ?? [];

  const section = (title: string, items: string[]) =>
    `## ${title}\n${items.length ? items.map((i) => `- ${i}`).join("\n") : "_None._"}`;

  const markdown = error
    ? `# Failed to load relationships\n\n${error.message}`
    : [
        `# Relationships — \`${table}\``,
        "",
        section(
          "References (outgoing)",
          outgoing.map((fk) => `\`${fk.fromColumn}\` → \`${fk.toTable}.${fk.toColumn}\`  ·  _${fk.constraint}_`),
        ),
        "",
        section(
          "Referenced by (incoming)",
          incoming.map((fk) => `\`${fk.fromTable}.${fk.fromColumn}\` → \`${fk.toColumn}\`  ·  _${fk.constraint}_`),
        ),
      ].join("\n");

  const mermaid = buildMermaid([...outgoing, ...incoming]);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${database}.${table} — relationships`}
      markdown={markdown}
      actions={
        <ActionPanel>
          {error ? (
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
          ) : (
            <Action.CopyToClipboard title="Copy as Mermaid ER Diagram" content={mermaid} icon={Icon.Code} />
          )}
        </ActionPanel>
      }
    />
  );
}
