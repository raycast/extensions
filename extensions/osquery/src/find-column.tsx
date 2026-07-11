import {
  Action,
  ActionPanel,
  List,
  getPreferenceValues,
  Icon,
  Color,
  Form,
  showToast,
  Toast,
  Clipboard,
  popToRoot,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { getSchema, filterByPlatform } from "./schema/loader";
import { OsqueryTable, PLATFORM_ICONS } from "./schema/types";
import { CATEGORY_INFO, getTableCategory } from "./schema/categories";

function getPlatformAccessories(platforms: string[]): List.Item.Accessory[] {
  return platforms
    .map((p) => ({
      icon: PLATFORM_ICONS[p] || undefined,
      tooltip:
        p === "darwin"
          ? "macOS"
          : p === "linux"
            ? "Linux"
            : p === "windows"
              ? "Windows"
              : p,
    }))
    .filter((a) => a.icon);
}

function getRequiredColumns(table: OsqueryTable): string[] {
  return table.columns.filter((c) => c.required).map((c) => c.name);
}

interface ColumnMatch {
  columnName: string;
  tables: OsqueryTable[];
  types: Set<string>;
}

// Step 3: Build JOIN Query Form
function JoinQueryBuilder({
  columnName,
  table1,
  tables,
}: {
  columnName: string;
  table1: OsqueryTable;
  tables: OsqueryTable[];
}) {
  const otherTables = tables.filter((t) => t.name !== table1.name);
  const [table2Name, setTable2Name] = useState(otherTables[0]?.name || "");
  const [joinType, setJoinType] = useState("JOIN");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [whereValues, setWhereValues] = useState<Record<string, string>>({});

  const table2 = otherTables.find((t) => t.name === table2Name);

  // Get all required columns from both tables with descriptions
  const requiredColumns = useMemo(() => {
    const cols: {
      key: string;
      table: string;
      column: string;
      description: string;
      type: string;
    }[] = [];
    const t1Req = getRequiredColumns(table1);
    for (const colName of t1Req) {
      if (colName !== columnName) {
        const colDef = table1.columns.find((c) => c.name === colName);
        cols.push({
          key: `${table1.name}.${colName}`,
          table: table1.name,
          column: colName,
          description: colDef?.description || "",
          type: colDef?.type || "TEXT",
        });
      }
    }
    if (table2) {
      const t2Req = getRequiredColumns(table2);
      for (const colName of t2Req) {
        if (colName !== columnName) {
          const colDef = table2.columns.find((c) => c.name === colName);
          cols.push({
            key: `${table2.name}.${colName}`,
            table: table2.name,
            column: colName,
            description: colDef?.description || "",
            type: colDef?.type || "TEXT",
          });
        }
      }
    }
    return cols;
  }, [table1, table2, columnName]);

  const availableColumns = useMemo(() => {
    const cols: { value: string; title: string }[] = [];
    for (const c of table1.columns.filter((c) => !c.hidden)) {
      cols.push({
        value: `${table1.name}.${c.name}`,
        title: `${table1.name}.${c.name} (${c.type})`,
      });
    }
    if (table2) {
      for (const c of table2.columns.filter((c) => !c.hidden)) {
        cols.push({
          value: `${table2.name}.${c.name}`,
          title: `${table2.name}.${c.name} (${c.type})`,
        });
      }
    }
    return cols;
  }, [table1, table2]);

  const generatedQuery = useMemo(() => {
    if (!table2) return "";

    const selectCols =
      selectedColumns.length > 0 ? selectedColumns.join(",\n       ") : "*";

    let query = `SELECT ${selectCols}\nFROM ${table1.name}\n${joinType} ${table2.name} USING (${columnName})`;

    if (requiredColumns.length > 0) {
      const whereClauses = requiredColumns.map((rc) => {
        const value = whereValues[rc.key] || "<value>";
        return `${rc.key} = '${value}'`;
      });
      query += `\nWHERE ${whereClauses.join("\n  AND ")}`;
    }

    return query + ";";
  }, [
    table1,
    table2,
    joinType,
    columnName,
    selectedColumns,
    requiredColumns,
    whereValues,
  ]);

  async function handleSubmit() {
    if (!generatedQuery) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select a second table",
      });
      return;
    }
    await Clipboard.copy(generatedQuery);
    await showToast({
      style: Toast.Style.Success,
      title: "JOIN query copied!",
    });
    await popToRoot();
  }

  return (
    <Form
      navigationTitle={`JOIN on "${columnName}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy JOIN Query"
            onSubmit={handleSubmit}
            icon={Icon.Clipboard}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="First Table" text={table1.name} />
      <Form.Description title="Join Column" text={columnName} />

      {(table1.evented || table2?.evented) && (
        <Form.Description
          title="⚠️ Evented Table"
          text={`${[table1.evented ? table1.name : null, table2?.evented ? table2.name : null].filter(Boolean).join(", ")} requires events to be enabled. These tables subscribe to OS events and may be empty if events are disabled. See: https://osquery.io/schema/`}
        />
      )}

      <Form.Dropdown
        id="joinType"
        title="Join Type"
        value={joinType}
        onChange={setJoinType}
      >
        <Form.Dropdown.Item title="JOIN (INNER)" value="JOIN" />
        <Form.Dropdown.Item title="LEFT JOIN" value="LEFT JOIN" />
      </Form.Dropdown>

      <Form.Dropdown
        id="table2"
        title="Second Table"
        value={table2Name}
        onChange={setTable2Name}
      >
        {otherTables.map((t) => (
          <Form.Dropdown.Item
            key={t.name}
            title={`${t.name} - ${t.description.slice(0, 40)}...`}
            value={t.name}
          />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TagPicker
        id="columns"
        title="Select Columns"
        value={selectedColumns}
        onChange={setSelectedColumns}
      >
        {availableColumns.map((col) => (
          <Form.TagPicker.Item
            key={col.value}
            title={col.title}
            value={col.value}
          />
        ))}
      </Form.TagPicker>

      {requiredColumns.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description
            title="Required WHERE Values"
            text="These columns require values to query"
          />
          {requiredColumns.map((rc) => (
            <Form.TextField
              key={rc.key}
              id={rc.key}
              title={rc.column}
              placeholder={
                rc.type === "INTEGER" || rc.type === "BIGINT"
                  ? "e.g. 123"
                  : "e.g. /path/to/file"
              }
              info={`${rc.description}${rc.type ? ` (${rc.type})` : ""}`}
              value={whereValues[rc.key] || ""}
              onChange={(value) =>
                setWhereValues((prev) => ({ ...prev, [rc.key]: value }))
              }
            />
          ))}
        </>
      )}

      <Form.Separator />
      <Form.Description
        title="Generated Query"
        text={generatedQuery || "Select a second table"}
      />
    </Form>
  );
}

// Step 2b: Multi-table query builder
function MultiTableQueryBuilder({
  columnName,
  tables,
}: {
  columnName: string;
  tables: OsqueryTable[];
}) {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [joinType, setJoinType] = useState("JOIN");

  const generatedQuery = useMemo(() => {
    if (selectedTables.length === 0) return "";
    if (selectedTables.length === 1) {
      const t = tables.find((t) => t.name === selectedTables[0]);
      const requiredCols = t ? getRequiredColumns(t) : [];
      let query = `SELECT * FROM ${selectedTables[0]}`;
      if (requiredCols.length > 0) {
        query += `\nWHERE ${requiredCols.map((c) => `${c} = '<value>'`).join(" AND ")}`;
      }
      return query + ";";
    }

    // Multiple tables - build JOIN
    const firstTable = selectedTables[0];
    let query = `SELECT *\nFROM ${firstTable}`;

    for (let i = 1; i < selectedTables.length; i++) {
      query += `\n${joinType} ${selectedTables[i]} USING (${columnName})`;
    }

    // Add WHERE for required columns
    const allRequired: string[] = [];
    for (const tName of selectedTables) {
      const t = tables.find((t) => t.name === tName);
      if (t) {
        const req = getRequiredColumns(t).filter((c) => c !== columnName);
        for (const r of req) {
          if (!allRequired.includes(`${tName}.${r}`)) {
            allRequired.push(`${tName}.${r}`);
          }
        }
      }
    }
    if (allRequired.length > 0) {
      query += `\nWHERE ${allRequired.map((c) => `${c} = '<value>'`).join("\n  AND ")}`;
    }

    return query + ";";
  }, [selectedTables, joinType, columnName, tables]);

  async function handleSubmit() {
    if (!generatedQuery) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select at least one table",
      });
      return;
    }
    await Clipboard.copy(generatedQuery);
    await showToast({ style: Toast.Style.Success, title: "Query copied!" });
    await popToRoot();
  }

  return (
    <Form
      navigationTitle={`Build Query on "${columnName}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy Query"
            onSubmit={handleSubmit}
            icon={Icon.Clipboard}
          />
        </ActionPanel>
      }
    >
      <Form.TagPicker
        id="tables"
        title="Select Tables"
        value={selectedTables}
        onChange={setSelectedTables}
      >
        {tables.map((t) => (
          <Form.TagPicker.Item key={t.name} title={t.name} value={t.name} />
        ))}
      </Form.TagPicker>

      {selectedTables.length > 1 && (
        <Form.Dropdown
          id="joinType"
          title="Join Type"
          value={joinType}
          onChange={setJoinType}
        >
          <Form.Dropdown.Item title="JOIN (INNER)" value="JOIN" />
          <Form.Dropdown.Item title="LEFT JOIN" value="LEFT JOIN" />
        </Form.Dropdown>
      )}

      <Form.Separator />
      <Form.Description
        title="Query Preview"
        text={generatedQuery || "Select tables to generate query"}
      />
    </Form>
  );
}

// Single-table column selection query builder
function ColumnSelectQueryBuilder({ table }: { table: OsqueryTable }) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [whereValues, setWhereValues] = useState<Record<string, string>>({});

  const availableColumns = useMemo(
    () => table.columns.filter((c) => !c.hidden),
    [table],
  );

  const requiredCols = useMemo(() => getRequiredColumns(table), [table]);

  const generatedQuery = useMemo(() => {
    const cols =
      selectedColumns.length > 0 ? selectedColumns.join(",\n       ") : "*";
    let query = `SELECT ${cols}\nFROM ${table.name}`;

    if (requiredCols.length > 0) {
      const whereClauses = requiredCols.map((col) => {
        const value = whereValues[col] || "<value>";
        return `${col} = '${value}'`;
      });
      query += `\nWHERE ${whereClauses.join("\n  AND ")}`;
    }

    return query + ";";
  }, [selectedColumns, table, requiredCols, whereValues]);

  async function handleSubmit() {
    await Clipboard.copy(generatedQuery);
    await showToast({ style: Toast.Style.Success, title: "Query copied!" });
    await popToRoot();
  }

  return (
    <Form
      navigationTitle={`Build Query: ${table.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Copy Query"
            onSubmit={handleSubmit}
            icon={Icon.Clipboard}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Table" text={table.name} />

      {table.evented && (
        <Form.Description
          title="Evented"
          text="This table subscribes to OS events and may be empty if events are disabled."
        />
      )}

      <Form.TagPicker
        id="columns"
        title="Select Columns"
        value={selectedColumns}
        onChange={setSelectedColumns}
      >
        {availableColumns.map((col) => (
          <Form.TagPicker.Item
            key={col.name}
            title={`${col.name} (${col.type})`}
            value={col.name}
          />
        ))}
      </Form.TagPicker>

      {requiredCols.length > 0 && (
        <>
          <Form.Separator />
          <Form.Description
            title="Required WHERE"
            text="These columns require values"
          />
          {requiredCols.map((colName) => {
            const col = table.columns.find((c) => c.name === colName);
            return (
              <Form.TextField
                key={colName}
                id={colName}
                title={colName}
                placeholder={
                  col?.type === "INTEGER" || col?.type === "BIGINT"
                    ? "e.g. 123"
                    : "e.g. value"
                }
                info={col?.description || ""}
                value={whereValues[colName] || ""}
                onChange={(value) =>
                  setWhereValues((prev) => ({ ...prev, [colName]: value }))
                }
              />
            );
          })}
        </>
      )}

      <Form.Separator />
      <Form.Description title="Preview" text={generatedQuery} />
    </Form>
  );
}

// Step 2: Pick a table (and optionally build JOIN)
function TablePicker({
  columnName,
  tables,
}: {
  columnName: string;
  tables: OsqueryTable[];
}) {
  const isJoinable = tables.length > 1;

  return (
    <List
      isShowingDetail
      navigationTitle={`"${columnName}" → Pick Table`}
      searchBarPlaceholder="Filter tables..."
    >
      {isJoinable && (
        <List.Section title="Quick Actions">
          <List.Item
            title="Build Multi-Table Query"
            subtitle={`Join ${tables.length} tables on "${columnName}"`}
            icon={Icon.Link}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Build Multi-Table Query"
                  icon={Icon.Link}
                  target={
                    <MultiTableQueryBuilder
                      columnName={columnName}
                      tables={tables}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section
        title={
          isJoinable
            ? `Tables with "${columnName}" (${tables.length})`
            : "Pick a table"
        }
      >
        {tables.map((table) => {
          const requiredCols = getRequiredColumns(table);
          const hasRequired = requiredCols.length > 0;
          const category = getTableCategory(table);
          const categoryInfo = CATEGORY_INFO[category];

          let query = `SELECT ${columnName} FROM ${table.name}`;
          if (hasRequired) {
            query += `\nWHERE ${requiredCols.map((c) => `${c} = '<value>'`).join(" AND ")}`;
          }
          query += ";";

          const col = table.columns.find((c) => c.name === columnName);
          const platformColor = (p: string): Color => {
            switch (p) {
              case "darwin":
                return Color.Purple;
              case "linux":
                return Color.Orange;
              case "windows":
                return Color.Blue;
              default:
                return Color.SecondaryText;
            }
          };

          return (
            <List.Item
              key={table.name}
              title={table.name}
              accessories={[
                ...(hasRequired
                  ? [{ tag: { value: "WHERE", color: Color.Red } }]
                  : []),
                ...(table.evented
                  ? [{ tag: { value: "EVENT", color: Color.Orange } }]
                  : []),
                ...getPlatformAccessories(table.platforms),
              ]}
              detail={
                <List.Item.Detail
                  markdown={`\`\`\`sql\n${query}\n\`\`\``}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.TagList title="Table">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={table.name}
                          color={Color.PrimaryText}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.TagList title="Category">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={categoryInfo.label}
                          color={categoryInfo.color}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.TagList title="Platforms">
                        {table.platforms.map((p) => (
                          <List.Item.Detail.Metadata.TagList.Item
                            key={p}
                            text={p}
                            color={platformColor(p)}
                          />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                      {requiredCols.length > 0 && (
                        <List.Item.Detail.Metadata.TagList title="Required WHERE">
                          {requiredCols.map((c) => (
                            <List.Item.Detail.Metadata.TagList.Item
                              key={c}
                              text={c}
                              color={Color.Red}
                            />
                          ))}
                        </List.Item.Detail.Metadata.TagList>
                      )}
                      {table.evented && (
                        <List.Item.Detail.Metadata.TagList title="Evented">
                          <List.Item.Detail.Metadata.TagList.Item
                            text="Yes"
                            color={Color.Orange}
                          />
                        </List.Item.Detail.Metadata.TagList>
                      )}
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.TagList
                        title={`Column: ${columnName}`}
                      >
                        <List.Item.Detail.Metadata.TagList.Item
                          text={col?.type || "unknown"}
                          color={Color.Blue}
                        />
                        {col?.required && (
                          <List.Item.Detail.Metadata.TagList.Item
                            text="required"
                            color={Color.Red}
                          />
                        )}
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Query">
                    <Action.Push
                      title="Build Custom Query"
                      icon="osquery.svg"
                      target={<ColumnSelectQueryBuilder table={table} />}
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy SELECT Query"
                      content={query}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.CopyToClipboard
                      title="Copy SELECT * Query"
                      content={`SELECT * FROM ${table.name}${hasRequired ? `\nWHERE ${requiredCols.map((c) => `${c} = '<value>'`).join(" AND ")}` : ""};`}
                    />
                  </ActionPanel.Section>

                  {isJoinable && (
                    <ActionPanel.Section title="JOIN">
                      <Action.Push
                        title={`Build JOIN Query (${tables.length - 1} Other Tables)`}
                        icon={Icon.Link}
                        target={
                          <JoinQueryBuilder
                            columnName={columnName}
                            table1={table}
                            tables={tables}
                          />
                        }
                        shortcut={{ modifiers: ["cmd"], key: "j" }}
                      />
                    </ActionPanel.Section>
                  )}

                  <ActionPanel.Section title="Docs">
                    <Action.OpenInBrowser
                      title="Open Docs"
                      url={`https://osquery.io/schema/#${table.name}`}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                    <Action.OpenInBrowser title="Open Specs" url={table.url} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

// Step 1: Pick a column
export default function FindColumn() {
  const preferences = getPreferenceValues<Preferences>();
  const platform = preferences.defaultPlatform || "darwin";
  const [searchText, setSearchText] = useState("");

  const allTables = useMemo(() => {
    return filterByPlatform(getSchema(), platform);
  }, [platform]);

  // Build column index
  const columnMatches = useMemo<ColumnMatch[]>(() => {
    const columnIndex = new Map<
      string,
      { tables: OsqueryTable[]; types: Set<string> }
    >();

    for (const table of allTables) {
      for (const col of table.columns) {
        if (col.hidden) continue;

        const key = col.name.toLowerCase();
        if (!columnIndex.has(key)) {
          columnIndex.set(key, { tables: [], types: new Set() });
        }
        const entry = columnIndex.get(key)!;
        entry.tables.push(table);
        entry.types.add(col.type);
      }
    }

    let matches = Array.from(columnIndex.entries()).map(([name, data]) => ({
      columnName: name,
      tables: data.tables,
      types: data.types,
    }));

    if (searchText) {
      const lower = searchText.toLowerCase();
      matches = matches.filter((m) => m.columnName.includes(lower));
    }

    matches.sort((a, b) => {
      if (searchText) {
        const aExact = a.columnName === searchText.toLowerCase();
        const bExact = b.columnName === searchText.toLowerCase();
        if (aExact && !bExact) return -1;
        if (bExact && !aExact) return 1;
      }
      // Sort by table count, then alphabetically
      if (b.tables.length !== a.tables.length) {
        return b.tables.length - a.tables.length;
      }
      return a.columnName.localeCompare(b.columnName);
    });

    return matches;
  }, [allTables, searchText]);

  // Split columns into joinable and single-table (limit each section)
  const joinableColumns = useMemo(() => {
    return columnMatches.filter((m) => m.tables.length > 1).slice(0, 50);
  }, [columnMatches]);

  const singleTableColumns = useMemo(() => {
    return columnMatches.filter((m) => m.tables.length === 1).slice(0, 50);
  }, [columnMatches]);

  return (
    <List
      searchBarPlaceholder="Type column name (e.g., pid, path, uid)..."
      onSearchTextChange={setSearchText}
    >
      {columnMatches.length === 0 && searchText.length > 0 ? (
        <List.EmptyView
          title="No Columns Found"
          description={`No columns matching "${searchText}"`}
          icon={Icon.XMarkCircle}
        />
      ) : (
        <>
          {/* Joinable columns section */}
          {joinableColumns.length > 0 && (
            <List.Section
              title={
                searchText
                  ? `Joinable Columns (${joinableColumns.length})`
                  : "Joinable Columns"
              }
              subtitle="Columns found in multiple tables"
            >
              {joinableColumns.map((match) => (
                <List.Item
                  key={match.columnName}
                  title={match.columnName}
                  subtitle={`${match.tables.length} tables`}
                  accessories={[
                    { tag: Array.from(match.types).join(", ") },
                    { tag: { value: "joinable", color: Color.Green } },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title={`Pick "${match.columnName}" → Choose Table`}
                        icon={Icon.ArrowRight}
                        target={
                          <TablePicker
                            columnName={match.columnName}
                            tables={match.tables}
                          />
                        }
                      />
                      <Action.CopyToClipboard
                        title="Copy Column Name"
                        content={match.columnName}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {/* Single-table columns section */}
          {singleTableColumns.length > 0 && (
            <List.Section
              title={
                searchText
                  ? `Single-Table Columns (${singleTableColumns.length})`
                  : "Single-Table Columns"
              }
              subtitle="Columns unique to one table"
            >
              {singleTableColumns.map((match) => (
                <List.Item
                  key={match.columnName}
                  title={match.columnName}
                  subtitle={match.tables[0]?.name || ""}
                  accessories={[{ tag: Array.from(match.types).join(", ") }]}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title={`Pick "${match.columnName}" → View Table`}
                        icon={Icon.ArrowRight}
                        target={
                          <TablePicker
                            columnName={match.columnName}
                            tables={match.tables}
                          />
                        }
                      />
                      <Action.CopyToClipboard
                        title="Copy Column Name"
                        content={match.columnName}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
