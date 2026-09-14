import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { listColumns, listForeignKeys, listIndexes, listTables, type ColumnInfo, type TableInfo } from "./lib/client";
import { getActiveConnection } from "./lib/connections";
import { qualify } from "./lib/sql";
import { NoConnection } from "./views/no-connection";
import RunQuery from "./run-query";

export default function BrowseSchema() {
  const { data, isLoading, error } = useCachedPromise(async () => {
    const connection = await getActiveConnection();
    if (!connection) return undefined;
    return { connection, tables: await listTables(connection) };
  }, []);

  useEffect(() => {
    if (error) showFailureToast(error, { title: "Could not read the schema" });
  }, [error]);

  if (!isLoading && !data) return <NoConnection />;

  const tables: TableInfo[] = data?.tables ?? [];
  const schemas = [...new Set(tables.map((table) => table.schema))];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tables…">
      {schemas.map((schema) => (
        <List.Section key={schema} title={schema}>
          {tables
            .filter((table) => table.schema === schema)
            .map((table) => (
              <TableItem key={`${table.schema}.${table.name}`} table={table} />
            ))}
        </List.Section>
      ))}
    </List>
  );
}

function TableItem({ table }: { table: TableInfo }) {
  const accessories = [
    // Pinned to en-US: the interface is English, so a German machine must not render 24000 as
    // "24.000", which an English reader parses as twenty-four.
    table.estimatedRows !== null ? { text: `~${table.estimatedRows.toLocaleString("en-US")} rows` } : undefined,
    table.size ? { tag: table.size } : undefined,
  ].filter(Boolean) as List.Item.Accessory[];

  return (
    <List.Item
      icon={table.kind.includes("view") ? Icon.Eye : Icon.HardDrive}
      title={table.name}
      subtitle={table.kind === "table" ? undefined : table.kind}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Columns"
            icon={Icon.List}
            target={<TableDetail schema={table.schema} table={table.name} />}
          />
          <Action.Push
            title="Select First 100 Rows"
            icon={Icon.Play}
            target={<RunQuery draftSql={`SELECT * FROM ${qualify(table.schema, table.name)} LIMIT 100;`} />}
          />
          <Action.CopyToClipboard title="Copy Qualified Name" content={qualify(table.schema, table.name)} />
        </ActionPanel>
      }
    />
  );
}

function TableDetail({ schema, table }: { schema: string; table: string }) {
  const { data, isLoading } = useCachedPromise(
    async (schemaName: string, tableName: string) => {
      const connection = await getActiveConnection();
      if (!connection) return undefined;
      const [columns, indexes, foreignKeys] = await Promise.all([
        listColumns(connection, schemaName, tableName),
        listIndexes(connection, schemaName, tableName),
        listForeignKeys(connection, schemaName, tableName),
      ]);
      return { columns, indexes, foreignKeys };
    },
    [schema, table],
  );

  return (
    <List isLoading={isLoading} navigationTitle={`${schema}.${table}`} searchBarPlaceholder="Search columns…">
      <List.Section title="Columns">
        {(data?.columns ?? []).map((column) => (
          <ColumnItem key={column.name} column={column} />
        ))}
      </List.Section>
      <List.Section title="Indexes">
        {(data?.indexes ?? []).map((index) => (
          <List.Item
            key={index.name}
            icon={index.isPrimary ? Icon.Key : Icon.MagnifyingGlass}
            title={index.name}
            subtitle={index.definition}
            accessories={
              [
                index.scans === 0 ? { tag: { value: "never used", color: "#eb5757" } } : undefined,
                index.size ? { text: index.size } : undefined,
              ].filter(Boolean) as List.Item.Accessory[]
            }
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Definition" content={index.definition} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Foreign Keys">
        {[...(data?.foreignKeys.outgoing ?? []), ...(data?.foreignKeys.incoming ?? [])].map((fk) => (
          <List.Item
            key={`${fk.fromTable}.${fk.constraint}`}
            icon={Icon.Link}
            title={fk.constraint}
            subtitle={fk.definition}
            accessories={[{ text: `${fk.fromSchema}.${fk.fromTable} → ${fk.toSchema}.${fk.toTable}` }]}
          />
        ))}
      </List.Section>
    </List>
  );
}

function ColumnItem({ column }: { column: ColumnInfo }) {
  const accessories: List.Item.Accessory[] = [{ text: column.type }];
  if (column.primaryKey) accessories.unshift({ tag: { value: "PK", color: "#f2c94c" } });
  if (!column.nullable) accessories.unshift({ tag: "NOT NULL" });

  return (
    <List.Item
      icon={column.primaryKey ? Icon.Key : Icon.Circle}
      title={column.name}
      subtitle={column.comment ?? column.default ?? undefined}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Column Name" content={column.name} />
        </ActionPanel>
      }
    />
  );
}
