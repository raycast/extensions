import React, { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { useCachedPromise } from "@raycast/utils";
import { executeQuery } from "./lib/database";
import { addQueryToHistory } from "./lib/storage";
import { useDatabases } from "./hooks/useDatabase";
import { Database, QueryResult, TableInfo } from "./lib/types";
import { formatExecutionTime, formatValue, getRowIdentifier } from "./lib/utils";
import { loadFullSchema, ColumnWithTable, getTableSchema } from "./lib/schema";

export default function SearchTables() {
  const { databases, activeDatabase, activeDatabaseId, setActiveDatabaseId, isLoading: isLoadingDbs } = useDatabases();
  const [searchText, setSearchText] = useState("");

  const { data: tables = [], isLoading: isLoadingTables } = useCachedPromise(
    async (connStr) => {
      if (!connStr) return [];
      const { tables } = await loadFullSchema(connStr);
      return tables.map(
        (t): TableInfo => ({
          schema: t.schema,
          name: t.name,
          fullName: t.schema === "public" ? t.name : `${t.schema}.${t.name}`,
        }),
      );
    },
    [activeDatabase?.connectionString],
    { execute: !!activeDatabase },
  );

  if (databases.length === 0 && !isLoadingDbs) {
    return (
      <List>
        <List.EmptyView
          title="No databases configured"
          description="Use 'Manage Databases' to add a PostgreSQL connection"
        />
      </List>
    );
  }

  const filtered = tables.filter((t) => t.fullName.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List
      isLoading={isLoadingTables}
      searchBarPlaceholder="Filter tables..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Database" value={activeDatabaseId} onChange={setActiveDatabaseId}>
          {databases.map((db) => (
            <List.Dropdown.Item key={db.id} value={db.id} title={db.name} />
          ))}
        </List.Dropdown>
      }
    >
      {filtered.length === 0 ? (
        <List.EmptyView
          title="No tables found"
          description={searchText ? "Try a different search term" : "This database has no tables"}
        />
      ) : (
        filtered.map((table) => (
          <List.Item
            key={table.fullName}
            title={table.name}
            subtitle={table.schema !== "public" ? table.schema : undefined}
            icon={Icon.List}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Browse Table"
                  icon={Icon.Eye}
                  target={<TableBrowser table={table} database={activeDatabase!} />}
                />
                <Action.Push
                  title="View Schema"
                  icon={Icon.Document}
                  target={<TableSchema table={table} database={activeDatabase!} />}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function TableBrowser({ table, database }: { table: TableInfo; database: Database }) {
  const [results, setResults] = useState<QueryResult | null>(null);
  const [columns, setColumns] = useState<ColumnWithTable[]>([]);
  const [textColumns, setTextColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState("any");
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Loading table..." });

    try {
      const query = `SELECT * FROM ${table.fullName} LIMIT 20`;
      const [queryResult, schemaData] = await Promise.all([
        executeQuery(database.connectionString, query, database.isReadonly),
        loadFullSchema(database.connectionString),
      ]);

      setResults(queryResult);

      const tableColumns = schemaData.allColumns.filter(
        (c) => c.tableName === table.name && c.tableSchema === table.schema,
      );
      setColumns(tableColumns);
      setTextColumns(tableColumns.filter((c) => /char|text|string/i.test(c.dataType)).map((c) => c.columnName));

      await addQueryToHistory({
        id: uuidv4(),
        query,
        databaseId: database.id,
        databaseName: database.name,
        executedAt: new Date().toISOString(),
        rowCount: queryResult.rowCount,
      });

      toast.style = Toast.Style.Success;
      toast.title = `Loaded ${queryResult.rowCount} rows`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to load table";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchText.trim()) {
      await loadInitialData();
      return;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Searching..." });

    try {
      if (selectedColumn === "any" && textColumns.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No text columns to search";
        setIsLoading(false);
        return;
      }

      const searchPattern = `%${searchText.trim()}%`;
      const whereClause =
        selectedColumn === "any" ? textColumns.map((c) => `${c} ILIKE $1`).join(" OR ") : `${selectedColumn} ILIKE $1`;

      const query = `SELECT * FROM ${table.fullName} WHERE ${whereClause} LIMIT 20`;
      const queryResult = await executeQuery(database.connectionString, query, database.isReadonly, [searchPattern]);
      setResults(queryResult);

      await addQueryToHistory({
        id: uuidv4(),
        query,
        databaseId: database.id,
        databaseName: database.name,
        executedAt: new Date().toISOString(),
        rowCount: queryResult.rowCount,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Search completed";
      toast.message = `${queryResult.rowCount} rows in ${formatExecutionTime(queryResult.executionTime)}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Search failed";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  if (!results) {
    return (
      <List isLoading={isLoading} searchText={searchText} onSearchTextChange={setSearchText}>
        <List.EmptyView title="Loading table..." icon={Icon.Clock} />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={results.rowCount > 0}
      navigationTitle={`${table.fullName} (${results.rowCount} rows)`}
      searchBarPlaceholder="Search in table..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Column" value={selectedColumn} onChange={setSelectedColumn}>
          <List.Dropdown.Item value="any" title="Any (all text columns)" />
          <List.Dropdown.Section title="Columns">
            {columns.map((c) => (
              <List.Dropdown.Item key={c.columnName} value={c.columnName} title={`${c.columnName} (${c.dataType})`} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {results.rowCount === 0 ? (
        <List.EmptyView
          title="No results"
          description={searchText ? "Try a different search term" : "This table is empty"}
          icon={Icon.MagnifyingGlass}
          actions={
            searchText ? (
              <ActionPanel>
                <Action title="Search" icon={Icon.MagnifyingGlass} onAction={handleSearch} />
                <Action
                  title="Clear Search"
                  icon={Icon.Trash}
                  onAction={() => {
                    setSearchText("");
                    loadInitialData();
                  }}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      ) : (
        results.rows.map((row, i) => (
          <List.Item
            key={i}
            title={getRowIdentifier(row, results.fields)}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    {Object.keys(row).map((col) => (
                      <List.Item.Detail.Metadata.Label key={col} title={col} text={formatValue(row[col])} />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action title="Search" icon={Icon.MagnifyingGlass} onAction={handleSearch} />
                <Action.CopyToClipboard title="Copy Row as JSON" content={JSON.stringify(row, null, 2)} />
                <Action.CopyToClipboard
                  title="Copy All Results as JSON"
                  content={JSON.stringify(results.rows, null, 2)}
                />
                <Action
                  title="Clear Search"
                  icon={Icon.Trash}
                  onAction={() => {
                    setSearchText("");
                    loadInitialData();
                  }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function TableSchema({ table, database }: { table: TableInfo; database: Database }) {
  const { data: schema, isLoading } = useCachedPromise(
    () => getTableSchema(database.connectionString, table.name, table.schema),
    [],
  );

  if (!schema) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView title="Loading schema..." icon={Icon.Clock} />
      </List>
    );
  }

  const fkMap = new Map(
    schema.foreignKeys.map((fk) => [fk.columnName, `${fk.referencedTable}.${fk.referencedColumn}`]),
  );

  return (
    <List navigationTitle={`Schema: ${table.fullName}`} searchBarPlaceholder="Filter columns and indices..." filtering>
      <List.Section title="Columns">
        {schema.columns.map((col) => {
          const tags = [];
          if (col.isPrimaryKey) tags.push("PK");
          if (!col.nullable) tags.push("NOT NULL");
          const fkRef = fkMap.get(col.name);
          if (fkRef) tags.push(`FK → ${fkRef}`);

          return (
            <List.Item
              key={col.name}
              title={col.name}
              subtitle={col.type}
              accessories={tags.map((tag) => ({ tag }))}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Name" text={col.name} />
                      <List.Item.Detail.Metadata.Label title="Type" text={col.type} />
                      <List.Item.Detail.Metadata.Label title="Nullable" text={col.nullable ? "Yes" : "No"} />
                      {col.isPrimaryKey && <List.Item.Detail.Metadata.Label title="Primary Key" text="Yes" />}
                      {col.defaultValue && <List.Item.Detail.Metadata.Label title="Default" text={col.defaultValue} />}
                      {fkRef && <List.Item.Detail.Metadata.Label title="Foreign Key" text={fkRef} />}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Column Name" content={col.name} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {schema.indexes.length > 0 && (
        <List.Section title="Indices">
          {schema.indexes.map((idx) => {
            const tags = [];
            if (idx.isPrimary) tags.push("PRIMARY KEY");
            if (idx.isUnique) tags.push("UNIQUE");
            const cols = idx.definition.match(/\(([^)]+)\)/)?.[1] || "";

            return (
              <List.Item
                key={idx.name}
                title={idx.name}
                subtitle={cols}
                accessories={tags.map((tag) => ({ tag }))}
                detail={
                  <List.Item.Detail
                    markdown={`\`\`\`sql\n${idx.definition}\n\`\`\``}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Name" text={idx.name} />
                        {idx.isPrimary && <List.Item.Detail.Metadata.Label title="Primary Key" text="Yes" />}
                        {idx.isUnique && <List.Item.Detail.Metadata.Label title="Unique" text="Yes" />}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Index Name" content={idx.name} />
                    <Action.CopyToClipboard title="Copy Definition" content={idx.definition} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
