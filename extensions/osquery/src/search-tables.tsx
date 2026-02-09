import {
  Action,
  ActionPanel,
  List,
  Form,
  Detail,
  getPreferenceValues,
  Icon,
  Color,
  showToast,
  Toast,
  Clipboard,
  popToRoot,
  useNavigation,
  open,
} from "@raycast/api";
import { useState, useMemo } from "react";
import { getSchema, filterByPlatform, searchTables } from "./schema/loader";
import {
  OsqueryTable,
  OsqueryColumn,
  Platform,
  PLATFORM_ICONS,
} from "./schema/types";
import {
  TableCategory,
  CATEGORY_INFO,
  filterByCategory,
  getTableCategory,
} from "./schema/categories";

type SearchMode = "tables" | "columns";

interface FlatColumn {
  column: OsqueryColumn;
  table: OsqueryTable;
}

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

function TableDetail({ table }: { table: OsqueryTable }) {
  const requiredCols = getRequiredColumns(table);
  const category = getTableCategory(table);
  const categoryInfo = CATEGORY_INFO[category];
  const visibleColumns = table.columns.filter((c) => !c.hidden);

  // Color for column types
  const typeColor = (type: string): Color => {
    switch (type.toUpperCase()) {
      case "INTEGER":
      case "BIGINT":
        return Color.Blue;
      case "TEXT":
        return Color.Green;
      case "DOUBLE":
        return Color.Purple;
      default:
        return Color.SecondaryText;
    }
  };

  // Platform colors
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
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Table">
            <List.Item.Detail.Metadata.TagList.Item
              text={table.name}
              color={Color.PrimaryText}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="" text={table.description} />
          <List.Item.Detail.Metadata.Separator />
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
              {requiredCols.map((col) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={col}
                  text={col}
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
          <List.Item.Detail.Metadata.Link
            title="Docs"
            text="osquery.io"
            target={`https://osquery.io/schema/#${table.name}`}
          />
          <List.Item.Detail.Metadata.Link
            title="Specs"
            text="GitHub"
            target={table.url}
          />
          <List.Item.Detail.Metadata.Separator />
          {visibleColumns.map((col) => (
            <List.Item.Detail.Metadata.TagList key={col.name} title={col.name}>
              <List.Item.Detail.Metadata.TagList.Item
                text={col.type}
                color={typeColor(col.type)}
              />
              {col.required && (
                <List.Item.Detail.Metadata.TagList.Item
                  text="required"
                  color={Color.Red}
                />
              )}
            </List.Item.Detail.Metadata.TagList>
          ))}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

// Policy query builder helpers
interface WhereCondition {
  column: string;
  operator: string;
  value: string;
}

type PolicyOperator =
  | "="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "LIKE"
  | "IN"
  | "IS NULL"
  | "IS NOT NULL";

const POLICY_OPERATORS: {
  value: PolicyOperator;
  title: string;
  needsValue: boolean;
}[] = [
  { value: "=", title: "equals (=)", needsValue: true },
  { value: "!=", title: "not equals (!=)", needsValue: true },
  { value: ">", title: "greater than (>)", needsValue: true },
  { value: "<", title: "less than (<)", needsValue: true },
  { value: ">=", title: "greater or equal (>=)", needsValue: true },
  { value: "<=", title: "less or equal (<=)", needsValue: true },
  { value: "LIKE", title: "LIKE (pattern match)", needsValue: true },
  { value: "IN", title: "IN (list)", needsValue: true },
  { value: "IS NULL", title: "IS NULL", needsValue: false },
  { value: "IS NOT NULL", title: "IS NOT NULL", needsValue: false },
];

function formatPolicyValue(value: string, operator: PolicyOperator): string {
  if (operator === "IN") {
    return `(${value})`;
  }
  if (operator === "LIKE") {
    return `'${value}'`;
  }
  if (!isNaN(Number(value))) {
    return value;
  }
  return `'${value}'`;
}

function buildPolicyQuery(
  table: string,
  whereConditions: WhereCondition[],
): { query: string; hasConditions: boolean } {
  let query = `SELECT 1 FROM ${table}`;

  const validConditions = whereConditions.filter((w) => {
    if (!w.column) return false;
    const op = POLICY_OPERATORS.find((o) => o.value === w.operator);
    if (op?.needsValue && !w.value) return false;
    return true;
  });

  const hasConditions = validConditions.length > 0;

  if (hasConditions) {
    const clauses = validConditions.map((w) => {
      const op = POLICY_OPERATORS.find((o) => o.value === w.operator);
      if (op?.needsValue) {
        return `${w.column} ${w.operator} ${formatPolicyValue(w.value, w.operator as PolicyOperator)}`;
      }
      return `${w.column} ${w.operator}`;
    });
    query += ` WHERE ${clauses.join(" AND ")}`;
  }

  return { query: query + ";", hasConditions };
}

function generatePolicyQuestion(
  table: string,
  whereConditions: WhereCondition[],
): string {
  const validConditions = whereConditions.filter((w) => {
    if (!w.column) return false;
    const op = POLICY_OPERATORS.find((o) => o.value === w.operator);
    if (op?.needsValue && !w.value) return false;
    return true;
  });

  if (validConditions.length === 0) {
    return `Is there any row in '${table}'?`;
  }

  const conditionDescriptions = validConditions.map((w) => {
    switch (w.operator) {
      case "=":
        return `${w.column} is '${w.value}'`;
      case "!=":
        return `${w.column} is not '${w.value}'`;
      case ">":
        return `${w.column} is greater than '${w.value}'`;
      case "<":
        return `${w.column} is less than '${w.value}'`;
      case ">=":
        return `${w.column} is at least '${w.value}'`;
      case "<=":
        return `${w.column} is at most '${w.value}'`;
      case "LIKE":
        return `${w.column} matches '${w.value}'`;
      case "IN":
        return `${w.column} is one of (${w.value})`;
      case "IS NULL":
        return `${w.column} is null`;
      case "IS NOT NULL":
        return `${w.column} is not null`;
      default:
        return `${w.column} ${w.operator} ${w.value}`;
    }
  });

  if (conditionDescriptions.length === 1) {
    return `Is there a row in '${table}' where ${conditionDescriptions[0]}?`;
  }

  return `Is there a row in '${table}' where ${conditionDescriptions.join(" AND ")}?`;
}

interface PolicyPreviewProps {
  table: string;
  policyQuery: string;
  policyQuestion: string;
  hasConditions: boolean;
}

function PolicyPreview({
  table,
  policyQuery,
  policyQuestion,
  hasConditions,
}: PolicyPreviewProps) {
  const { pop } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const fleetUrl = preferences.fleetUrl?.replace(/\/$/, ""); // Remove trailing slash

  const markdown = `
# Fleet Policy Preview

## Policy Query

\`\`\`sql
${policyQuery}
\`\`\`

## Policy Question

> ${policyQuestion}

## How Fleet Policies Work

| Result | Meaning |
|--------|---------|
| **Pass** | Query returns 1+ rows (condition is true) |
| **Fail** | Query returns 0 rows (condition is false) |

${!hasConditions ? `\n⚠️ **Warning:** No WHERE conditions specified. This policy will **always pass** if the \`${table}\` table has any rows.\n` : ""}

---

*Copy this query and paste it into Fleet's policy editor.*
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Policy Query"
            content={policyQuery}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Question"
            content={policyQuestion}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Single Line"
            content={policyQuery.replace(/\n/g, " ")}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
          {fleetUrl && (
            <Action
              title="Open in Fleet"
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={async () => {
                await Clipboard.copy(policyQuery);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Query copied to clipboard",
                });
                await open(`${fleetUrl}/policies/new`);
              }}
            />
          )}
          <Action
            title="Back"
            icon={Icon.ArrowLeft}
            onAction={pop}
            shortcut={{ modifiers: ["cmd"], key: "[" }}
          />
        </ActionPanel>
      }
    />
  );
}

// Multi-column query builder form
function ColumnSelectQueryBuilder({ table }: { table: OsqueryTable }) {
  const { push } = useNavigation();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [whereValues, setWhereValues] = useState<Record<string, string>>({});

  // Optional WHERE clause state
  const [optionalWhereColumn, setOptionalWhereColumn] = useState<string>("");
  const [optionalWhereOperator, setOptionalWhereOperator] =
    useState<PolicyOperator>("=");
  const [optionalWhereValue, setOptionalWhereValue] = useState<string>("");

  const availableColumns = useMemo(
    () => table.columns.filter((c) => !c.hidden),
    [table],
  );

  const requiredCols = useMemo(() => getRequiredColumns(table), [table]);

  // Build all WHERE conditions for policy conversion
  const allWhereConditions = useMemo<WhereCondition[]>(() => {
    const conditions: WhereCondition[] = [];

    // Add required column conditions
    for (const colName of requiredCols) {
      conditions.push({
        column: colName,
        operator: "=",
        value: whereValues[colName] || "",
      });
    }

    // Add optional condition
    if (optionalWhereColumn) {
      conditions.push({
        column: optionalWhereColumn,
        operator: optionalWhereOperator,
        value: optionalWhereValue,
      });
    }

    return conditions;
  }, [
    requiredCols,
    whereValues,
    optionalWhereColumn,
    optionalWhereOperator,
    optionalWhereValue,
  ]);

  const generatedQuery = useMemo(() => {
    const cols =
      selectedColumns.length > 0 ? selectedColumns.join(",\n       ") : "*";
    let query = `SELECT ${cols}\nFROM ${table.name}`;

    const validConditions = allWhereConditions.filter((w) => {
      if (!w.column) return false;
      const op = POLICY_OPERATORS.find((o) => o.value === w.operator);
      if (op?.needsValue && !w.value) {
        // For required columns, show placeholder
        return requiredCols.includes(w.column);
      }
      return true;
    });

    if (validConditions.length > 0) {
      const whereClauses = validConditions.map((w) => {
        const op = POLICY_OPERATORS.find((o) => o.value === w.operator);
        if (op?.needsValue) {
          const val = w.value || "<value>";
          return `${w.column} ${w.operator} ${w.value ? formatPolicyValue(w.value, w.operator as PolicyOperator) : `'${val}'`}`;
        }
        return `${w.column} ${w.operator}`;
      });
      query += `\nWHERE ${whereClauses.join("\n  AND ")}`;
    }

    return query + ";";
  }, [selectedColumns, table, allWhereConditions, requiredCols]);

  async function handleSubmit() {
    await Clipboard.copy(generatedQuery);
    await showToast({ style: Toast.Style.Success, title: "Query copied!" });
    await popToRoot();
  }

  function handleConvertToPolicy() {
    const { query, hasConditions } = buildPolicyQuery(
      table.name,
      allWhereConditions,
    );
    const question = generatePolicyQuestion(table.name, allWhereConditions);

    push(
      <PolicyPreview
        table={table.name}
        policyQuery={query}
        policyQuestion={question}
        hasConditions={hasConditions}
      />,
    );
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
          <Action
            title="Convert to Policy"
            icon={Icon.Shield}
            onAction={handleConvertToPolicy}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
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

      {/* Optional WHERE clause */}
      <Form.Separator />
      <Form.Description title="Additional WHERE" text="Optional extra filter" />

      <Form.Dropdown
        id="whereColumn"
        title="Column"
        value={optionalWhereColumn}
        onChange={setOptionalWhereColumn}
      >
        <Form.Dropdown.Item title="None" value="" />
        {availableColumns
          .filter((col) => !col.required)
          .map((col) => (
            <Form.Dropdown.Item
              key={col.name}
              title={`${col.name} (${col.type})`}
              value={col.name}
            />
          ))}
      </Form.Dropdown>

      {optionalWhereColumn && (
        <>
          <Form.Dropdown
            id="whereOperator"
            title="Operator"
            value={optionalWhereOperator}
            onChange={(v) => setOptionalWhereOperator(v as PolicyOperator)}
          >
            {POLICY_OPERATORS.map((op) => (
              <Form.Dropdown.Item
                key={op.value}
                title={op.title}
                value={op.value}
              />
            ))}
          </Form.Dropdown>

          {POLICY_OPERATORS.find((o) => o.value === optionalWhereOperator)
            ?.needsValue && (
            <Form.TextField
              id="whereValue"
              title="Value"
              placeholder="Enter value..."
              value={optionalWhereValue}
              onChange={setOptionalWhereValue}
            />
          )}
        </>
      )}

      <Form.Separator />
      <Form.Description title="Preview" text={generatedQuery} />
    </Form>
  );
}

function findTablesWithColumn(
  columnName: string,
  tables: OsqueryTable[],
): OsqueryTable[] {
  return tables.filter((t) =>
    t.columns.some(
      (c) => c.name.toLowerCase() === columnName.toLowerCase() && !c.hidden,
    ),
  );
}

// Table picker when column exists in multiple tables
function RelatedTablesPicker({
  columnName,
  tables,
}: {
  columnName: string;
  tables: OsqueryTable[];
}) {
  return (
    <List navigationTitle={`"${columnName}" in ${tables.length} tables`}>
      {tables.map((table) => {
        const requiredCols = getRequiredColumns(table);
        const hasRequired = requiredCols.length > 0;
        const category = getTableCategory(table);
        const categoryInfo = CATEGORY_INFO[category];

        return (
          <List.Item
            key={table.name}
            title={table.name}
            subtitle={table.description}
            accessories={[
              { tag: { value: categoryInfo.label, color: categoryInfo.color } },
              ...getPlatformAccessories(table.platforms),
              ...(hasRequired
                ? [{ tag: { value: "WHERE", color: Color.Red } }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Navigate">
                  <Action.Push
                    title="View Table"
                    icon={Icon.Eye}
                    target={<TableView table={table} />}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Query">
                  <Action.Push
                    title="Build Custom Query"
                    icon="osquery.svg"
                    target={<ColumnSelectQueryBuilder table={table} />}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy SELECT Query"
                    content={`SELECT ${columnName} FROM ${table.name};`}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>
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
    </List>
  );
}

// Standalone table view for navigation from column mode
function TableView({ table }: { table: OsqueryTable }) {
  const requiredCols = getRequiredColumns(table);
  const hasRequired = requiredCols.length > 0;
  const category = getTableCategory(table);
  const categoryInfo = CATEGORY_INFO[category];

  const buildSelectQuery = () => {
    let query = `SELECT * FROM ${table.name}`;
    if (hasRequired) {
      query += `\nWHERE ${requiredCols.map((col) => `${col} = '<value>'`).join(" AND ")}`;
    }
    return query + ";";
  };

  const buildColumnsQuery = () => {
    const cols = table.columns
      .filter((c) => !c.hidden)
      .map((c) => c.name)
      .join(", ");
    let query = `SELECT ${cols} FROM ${table.name}`;
    if (hasRequired) {
      query += `\nWHERE ${requiredCols.map((col) => `${col} = '<value>'`).join(" AND ")}`;
    }
    return query + ";";
  };

  return (
    <List isShowingDetail navigationTitle={table.name}>
      <List.Item
        title={table.name}
        subtitle={`${categoryInfo.label} • ${table.columns.length} columns`}
        accessories={[
          ...getPlatformAccessories(table.platforms),
          ...(hasRequired
            ? [{ tag: { value: "WHERE", color: Color.Red } }]
            : []),
          ...(table.evented
            ? [{ tag: { value: "EVENT", color: Color.Orange } }]
            : []),
        ]}
        detail={<TableDetail table={table} />}
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
                title="Copy SELECT * Query"
                content={buildSelectQuery()}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy All Columns Query"
                content={buildColumnsQuery()}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Table Name"
                content={table.name}
              />
            </ActionPanel.Section>
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

      <List.Section title="Columns">
        {table.columns
          .filter((c) => !c.hidden)
          .map((col) => (
            <List.Item
              key={col.name}
              title={col.name}
              subtitle={col.description}
              accessories={[
                { tag: col.type },
                ...(col.required
                  ? [{ tag: { value: "required", color: Color.Red } }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Column Name"
                    content={col.name}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy SELECT Query"
                    content={`SELECT ${col.name} FROM ${table.name};`}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}

function ColumnDetail({
  flatColumn,
  relatedTables,
}: {
  flatColumn: FlatColumn;
  relatedTables: OsqueryTable[];
}) {
  const { column, table } = flatColumn;

  const typeColor = (type: string): Color => {
    switch (type.toUpperCase()) {
      case "INTEGER":
      case "BIGINT":
        return Color.Blue;
      case "TEXT":
        return Color.Green;
      case "DOUBLE":
        return Color.Purple;
      default:
        return Color.SecondaryText;
    }
  };

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Column">
            <List.Item.Detail.Metadata.TagList.Item
              text={column.name}
              color={Color.PrimaryText}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Type">
            <List.Item.Detail.Metadata.TagList.Item
              text={column.type}
              color={typeColor(column.type)}
            />
            {column.required && (
              <List.Item.Detail.Metadata.TagList.Item
                text="required"
                color={Color.Red}
              />
            )}
          </List.Item.Detail.Metadata.TagList>
          {column.description && (
            <List.Item.Detail.Metadata.Label
              title=""
              text={column.description}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Current Table"
            text={table.name}
          />
          <List.Item.Detail.Metadata.Label
            title="Found In"
            text={`${relatedTables.length} table${relatedTables.length > 1 ? "s" : ""}`}
          />
          {relatedTables.length > 1 && (
            <List.Item.Detail.Metadata.TagList title="Tables">
              {relatedTables.slice(0, 5).map((t) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={t.name}
                  text={t.name}
                  color={Color.SecondaryText}
                />
              ))}
              {relatedTables.length > 5 && (
                <List.Item.Detail.Metadata.TagList.Item
                  text={`+${relatedTables.length - 5} more`}
                  color={Color.SecondaryText}
                />
              )}
            </List.Item.Detail.Metadata.TagList>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function SearchTables() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [platform, setPlatform] = useState<Platform>(
    preferences.defaultPlatform || "darwin",
  );
  const [category, setCategory] = useState<TableCategory>("all");
  const [searchMode, setSearchMode] = useState<SearchMode>("tables");

  const allTables = useMemo(() => getSchema(), []);

  const filteredTables = useMemo(() => {
    let tables = filterByPlatform(allTables, platform);
    tables = filterByCategory(tables, category);
    return searchTables(tables, searchText);
  }, [allTables, platform, category, searchText]);

  // Flatten columns for column search mode
  const flatColumns = useMemo<FlatColumn[]>(() => {
    const columns: FlatColumn[] = [];
    for (const table of filteredTables) {
      for (const column of table.columns) {
        if (!column.hidden) {
          columns.push({ column, table });
        }
      }
    }

    // Filter by search text in column mode
    if (searchText && searchMode === "columns") {
      const lowerSearch = searchText.toLowerCase();
      return columns.filter(
        (fc) =>
          fc.column.name.toLowerCase().includes(lowerSearch) ||
          fc.column.description.toLowerCase().includes(lowerSearch),
      );
    }

    return columns;
  }, [filteredTables, searchText, searchMode]);

  return (
    <List
      isShowingDetail
      searchBarPlaceholder={
        searchMode === "tables"
          ? "Search tables, columns, or descriptions..."
          : "Search columns across all tables..."
      }
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filters"
          onChange={(value) => {
            // Parse composite value: mode:platform:category
            if (value.startsWith("mode:")) {
              setSearchMode(value.replace("mode:", "") as SearchMode);
            } else if (value.startsWith("platform:")) {
              setPlatform(value.replace("platform:", "") as Platform);
            } else if (value.startsWith("category:")) {
              setCategory(value.replace("category:", "") as TableCategory);
            }
          }}
        >
          <List.Dropdown.Section title="Search Mode">
            <List.Dropdown.Item
              title={
                searchMode === "tables" ? "✓ Search Tables" : "Search Tables"
              }
              value="mode:tables"
            />
            <List.Dropdown.Item
              title={
                searchMode === "columns" ? "✓ Search Columns" : "Search Columns"
              }
              value="mode:columns"
            />
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Platform">
            {(["all", "darwin", "linux", "windows"] as Platform[]).map((p) => (
              <List.Dropdown.Item
                key={p}
                title={`${platform === p ? "✓ " : ""}${p === "all" ? "All Platforms" : p === "darwin" ? "macOS" : p === "linux" ? "Linux" : "Windows"}`}
                value={`platform:${p}`}
                icon={p !== "all" ? PLATFORM_ICONS[p] : undefined}
              />
            ))}
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Category">
            {Object.entries(CATEGORY_INFO).map(([key, info]) => (
              <List.Dropdown.Item
                key={key}
                title={`${category === key ? "✓ " : ""}${info.label}`}
                value={`category:${key}`}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {searchMode === "tables"
        ? // TABLE MODE
          filteredTables.map((table) => {
            const requiredCols = getRequiredColumns(table);
            const hasRequired = requiredCols.length > 0;
            const tableCategory = getTableCategory(table);

            const buildSelectQuery = () => {
              let query = `SELECT * FROM ${table.name}`;
              if (hasRequired) {
                const whereClauses = requiredCols.map(
                  (col) => `${col} = '<value>'`,
                );
                query += `\nWHERE ${whereClauses.join(" AND ")}`;
              }
              return query + ";";
            };

            const buildColumnsQuery = () => {
              const cols = table.columns
                .filter((c) => !c.hidden)
                .map((c) => c.name)
                .join(", ");
              let query = `SELECT ${cols} FROM ${table.name}`;
              if (hasRequired) {
                const whereClauses = requiredCols.map(
                  (col) => `${col} = '<value>'`,
                );
                query += `\nWHERE ${whereClauses.join(" AND ")}`;
              }
              return query + ";";
            };

            return (
              <List.Item
                key={table.name}
                title={table.name}
                keywords={[
                  table.description,
                  ...table.columns.map((c) => c.name),
                  tableCategory,
                ]}
                accessories={[
                  ...(hasRequired
                    ? [{ tag: { value: "WHERE", color: Color.Red } }]
                    : []),
                  ...(table.evented
                    ? [{ tag: { value: "EVENT", color: Color.Orange } }]
                    : []),
                  ...getPlatformAccessories(table.platforms),
                ]}
                detail={<TableDetail table={table} />}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Query">
                      <Action.Push
                        title="Build Custom Query"
                        icon={Icon.Hammer}
                        target={<ColumnSelectQueryBuilder table={table} />}
                        shortcut={{ modifiers: ["cmd"], key: "b" }}
                      />
                      <Action.CopyToClipboard
                        title={
                          hasRequired
                            ? "Copy SELECT * Query (with WHERE)"
                            : "Copy SELECT * Query"
                        }
                        content={buildSelectQuery()}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title={
                          hasRequired
                            ? "Copy All Columns Query (with WHERE)"
                            : "Copy All Columns Query"
                        }
                        content={buildColumnsQuery()}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Table Name"
                        content={table.name}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Docs">
                      <Action.OpenInBrowser
                        title="Open Docs"
                        url={`https://osquery.io/schema/#${table.name}`}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <Action.OpenInBrowser
                        title="Open Specs"
                        url={table.url}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })
        : // COLUMN MODE
          flatColumns.map((fc, index) => {
            const { column, table } = fc;
            const relatedTables = findTablesWithColumn(
              column.name,
              filteredTables,
            );

            return (
              <List.Item
                key={`${table.name}.${column.name}.${index}`}
                title={column.name}
                subtitle={table.name}
                accessories={[
                  { tag: column.type },
                  ...(column.required
                    ? [{ tag: { value: "req", color: Color.Red } }]
                    : []),
                  ...(relatedTables.length > 1
                    ? [{ text: `${relatedTables.length}` }]
                    : []),
                ]}
                detail={
                  <ColumnDetail flatColumn={fc} relatedTables={relatedTables} />
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Navigate">
                      {relatedTables.length > 1 ? (
                        <Action.Push
                          title={`Browse ${relatedTables.length} Tables`}
                          icon={Icon.List}
                          target={
                            <RelatedTablesPicker
                              columnName={column.name}
                              tables={relatedTables}
                            />
                          }
                        />
                      ) : (
                        <Action.Push
                          title={`View ${table.name}`}
                          icon={Icon.Eye}
                          target={<TableView table={table} />}
                        />
                      )}
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Query">
                      <Action.Push
                        title="Build Custom Query"
                        icon={Icon.Hammer}
                        target={<ColumnSelectQueryBuilder table={table} />}
                        shortcut={{ modifiers: ["cmd"], key: "b" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy Column Name"
                        content={column.name}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action.CopyToClipboard
                        title="Copy SELECT Query"
                        content={`SELECT ${column.name} FROM ${table.name};`}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Docs">
                      <Action.OpenInBrowser
                        title="Open Docs"
                        url={`https://osquery.io/schema/#${table.name}`}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                      <Action.OpenInBrowser
                        title="Open Specs"
                        url={table.url}
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
