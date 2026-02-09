import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  Clipboard,
  popToRoot,
  getPreferenceValues,
  Icon,
  Color,
  useNavigation,
  Detail,
} from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { getSchema, filterByPlatform } from "./schema/loader";
import { OsqueryTable, OsqueryColumn } from "./schema/types";

interface WhereCondition {
  column: string;
  operator: string;
  value: string;
  required: boolean;
}

type Operator =
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

const OPERATORS: { value: Operator; title: string; needsValue: boolean }[] = [
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

function formatValue(value: string, operator: Operator): string {
  if (operator === "IN") {
    return `(${value})`;
  }
  if (operator === "LIKE") {
    return `'${value}'`;
  }
  if (isNaN(Number(value))) {
    return `'${value}'`;
  }
  return value;
}

function buildQuery(
  table: string,
  columns: string[],
  whereConditions: WhereCondition[],
  limit?: string,
  orderBy?: string,
): string {
  const selectCols = columns.length > 0 ? columns.join(", ") : "*";
  let query = `SELECT ${selectCols}\nFROM ${table}`;

  const validConditions = whereConditions.filter((w) => {
    if (!w.column) return false;
    const op = OPERATORS.find((o) => o.value === w.operator);
    if (op?.needsValue && !w.value) {
      // For required columns, show placeholder
      return w.required;
    }
    return true;
  });

  if (validConditions.length > 0) {
    const clauses = validConditions.map((w) => {
      const op = OPERATORS.find((o) => o.value === w.operator);
      if (op?.needsValue) {
        const val = w.value || "<value>";
        return `${w.column} ${w.operator} ${w.value ? formatValue(w.value, w.operator as Operator) : `'${val}'`}`;
      }
      return `${w.column} ${w.operator}`;
    });
    query += `\nWHERE ${clauses.join("\n  AND ")}`;
  }

  if (orderBy) {
    query += `\nORDER BY ${orderBy}`;
  }

  if (limit && !isNaN(Number(limit))) {
    query += `\nLIMIT ${limit}`;
  }

  return query + ";";
}

function buildPolicyQuery(
  table: string,
  whereConditions: WhereCondition[],
): { query: string; hasConditions: boolean } {
  let query = `SELECT 1 FROM ${table}`;

  const validConditions = whereConditions.filter((w) => {
    if (!w.column) return false;
    const op = OPERATORS.find((o) => o.value === w.operator);
    if (op?.needsValue && !w.value) return false;
    return true;
  });

  const hasConditions = validConditions.length > 0;

  if (hasConditions) {
    const clauses = validConditions.map((w) => {
      const op = OPERATORS.find((o) => o.value === w.operator);
      if (op?.needsValue) {
        return `${w.column} ${w.operator} ${formatValue(w.value, w.operator as Operator)}`;
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
    const op = OPERATORS.find((o) => o.value === w.operator);
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

export default function BuildQuery() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const platform = preferences.defaultPlatform || "darwin";

  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [limit, setLimit] = useState<string>("50");
  const [orderBy, setOrderBy] = useState<string>("");

  // Required column values (keyed by column name)
  const [requiredValues, setRequiredValues] = useState<Record<string, string>>(
    {},
  );

  // Optional WHERE clause
  const [optionalWhereColumn, setOptionalWhereColumn] = useState<string>("");
  const [optionalWhereOperator, setOptionalWhereOperator] =
    useState<Operator>("=");
  const [optionalWhereValue, setOptionalWhereValue] = useState<string>("");

  const tables = useMemo(() => {
    return filterByPlatform(getSchema(), platform);
  }, [platform]);

  const currentTable = useMemo<OsqueryTable | undefined>(() => {
    return tables.find((t) => t.name === selectedTable);
  }, [tables, selectedTable]);

  const columns = useMemo<OsqueryColumn[]>(() => {
    return currentTable?.columns.filter((c) => !c.hidden) || [];
  }, [currentTable]);

  const requiredColumns = useMemo<OsqueryColumn[]>(() => {
    return currentTable?.columns.filter((c) => c.required) || [];
  }, [currentTable]);

  // Reset required values when table changes
  useEffect(() => {
    setRequiredValues({});
    setOptionalWhereColumn("");
    setOptionalWhereValue("");
  }, [selectedTable]);

  const whereConditions = useMemo<WhereCondition[]>(() => {
    const conditions: WhereCondition[] = [];

    // Add required column conditions
    for (const col of requiredColumns) {
      conditions.push({
        column: col.name,
        operator: "=",
        value: requiredValues[col.name] || "",
        required: true,
      });
    }

    // Add optional condition
    if (optionalWhereColumn) {
      conditions.push({
        column: optionalWhereColumn,
        operator: optionalWhereOperator,
        value: optionalWhereValue,
        required: false,
      });
    }

    return conditions;
  }, [
    requiredColumns,
    requiredValues,
    optionalWhereColumn,
    optionalWhereOperator,
    optionalWhereValue,
  ]);

  const generatedQuery = useMemo(() => {
    if (!selectedTable) return "";
    return buildQuery(
      selectedTable,
      selectedColumns,
      whereConditions,
      limit,
      orderBy,
    );
  }, [selectedTable, selectedColumns, whereConditions, limit, orderBy]);

  const missingRequired = useMemo(() => {
    return requiredColumns.filter((col) => !requiredValues[col.name]);
  }, [requiredColumns, requiredValues]);

  async function handleSubmit() {
    if (!selectedTable) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a table",
      });
      return;
    }

    if (missingRequired.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing required WHERE values",
        message: `Fill in: ${missingRequired.map((c) => c.name).join(", ")}`,
      });
      return;
    }

    await Clipboard.copy(generatedQuery);
    await showToast({
      style: Toast.Style.Success,
      title: "Query copied to clipboard",
    });
    await popToRoot();
  }

  function handleConvertToPolicy() {
    if (!selectedTable) {
      showToast({ style: Toast.Style.Failure, title: "Please select a table" });
      return;
    }

    const { query, hasConditions } = buildPolicyQuery(
      selectedTable,
      whereConditions,
    );
    const question = generatePolicyQuestion(selectedTable, whereConditions);

    push(
      <PolicyPreview
        table={selectedTable}
        policyQuery={query}
        policyQuestion={question}
        hasConditions={hasConditions}
      />,
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy Query" onSubmit={handleSubmit} />
          {generatedQuery && (
            <Action.CopyToClipboard
              title="Copy Query Now"
              content={generatedQuery}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          {selectedTable && (
            <Action
              title="Convert to Policy"
              icon={Icon.Shield}
              onAction={handleConvertToPolicy}
              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="table"
        title="Table"
        value={selectedTable}
        onChange={setSelectedTable}
      >
        <Form.Dropdown.Item title="Select a table..." value="" />
        {tables.map((table) => {
          const hasRequired = table.columns.some((c) => c.required);
          return (
            <Form.Dropdown.Item
              key={table.name}
              title={
                hasRequired ? `${table.name} (WHERE required)` : table.name
              }
              value={table.name}
              icon={
                hasRequired
                  ? { source: Icon.ExclamationMark, tintColor: Color.Red }
                  : undefined
              }
            />
          );
        })}
      </Form.Dropdown>

      {currentTable && (
        <>
          <Form.TagPicker
            id="columns"
            title="Columns"
            value={selectedColumns}
            onChange={setSelectedColumns}
          >
            {columns.map((col) => (
              <Form.TagPicker.Item
                key={col.name}
                title={`${col.name} (${col.type})`}
                value={col.name}
              />
            ))}
          </Form.TagPicker>

          {/* Required WHERE columns */}
          {requiredColumns.length > 0 && (
            <>
              <Form.Separator />
              <Form.Description
                title="Required WHERE Columns"
                text="These columns MUST have values in the WHERE clause"
              />
              {requiredColumns.map((col) => (
                <Form.TextField
                  key={col.name}
                  id={`required_${col.name}`}
                  title={`${col.name} (${col.type})`}
                  placeholder={`Enter ${col.name} value (REQUIRED)`}
                  value={requiredValues[col.name] || ""}
                  onChange={(value) =>
                    setRequiredValues((prev) => ({
                      ...prev,
                      [col.name]: value,
                    }))
                  }
                  info={col.description}
                />
              ))}
            </>
          )}

          {/* Optional WHERE clause */}
          <Form.Separator />
          <Form.Description
            title="Additional WHERE"
            text="Optional extra filter"
          />

          <Form.Dropdown
            id="whereColumn"
            title="Column"
            value={optionalWhereColumn}
            onChange={setOptionalWhereColumn}
          >
            <Form.Dropdown.Item title="None" value="" />
            {columns
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
                onChange={(v) => setOptionalWhereOperator(v as Operator)}
              >
                {OPERATORS.map((op) => (
                  <Form.Dropdown.Item
                    key={op.value}
                    title={op.title}
                    value={op.value}
                  />
                ))}
              </Form.Dropdown>

              {OPERATORS.find((o) => o.value === optionalWhereOperator)
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
          <Form.Description title="Options" text="ORDER BY and LIMIT" />

          <Form.Dropdown
            id="orderBy"
            title="Order By"
            value={orderBy}
            onChange={setOrderBy}
          >
            <Form.Dropdown.Item title="None" value="" />
            {columns.map((col) => (
              <Form.Dropdown.Item
                key={col.name}
                title={col.name}
                value={col.name}
              />
            ))}
          </Form.Dropdown>

          <Form.TextField
            id="limit"
            title="Limit"
            placeholder="Number of rows"
            value={limit}
            onChange={setLimit}
          />

          <Form.Separator />
          <Form.Description
            title="Generated Query"
            text={generatedQuery || "Select a table to generate query"}
          />
          {missingRequired.length > 0 && (
            <Form.Description
              title=""
              text={`⚠️ Missing required: ${missingRequired.map((c) => c.name).join(", ")}`}
            />
          )}
        </>
      )}
    </Form>
  );
}
