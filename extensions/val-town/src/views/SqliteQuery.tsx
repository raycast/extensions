import { Action, ActionPanel, Color, Detail, Form, Icon, List, useNavigation, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { sqliteExecute } from "../lib/api";
import { errorMessage } from "../lib/format";
import type { SqliteResponse } from "../lib/types";

const TABLES_SQL = "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name";

export function SqliteQuery({ val }: { val: string }) {
  const { push } = useNavigation();
  const { data, isLoading, error } = useCachedPromise(
    (identifier: string) => sqliteExecute(identifier, TABLES_SQL),
    [val],
  );

  const tables = rowsOf(data)
    .map((row) => String(row.name ?? ""))
    .filter(Boolean);

  return (
    <List isLoading={isLoading} navigationTitle={`SQLite · ${val}`} searchBarPlaceholder="Filter tables">
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Could not read this database"
          description={errorMessage(error)}
        />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.List}
            title="No tables"
            description="This val has no project-scoped SQLite tables yet."
            actions={
              <ActionPanel>
                <Action
                  title="Run a Query"
                  icon={Icon.Terminal}
                  onAction={() => push(<QueryForm val={val} initialSql="" />)}
                />
              </ActionPanel>
            }
          />
          {tables.map((table) => (
            <List.Item
              key={table}
              icon={Icon.List}
              title={table}
              actions={
                <ActionPanel>
                  <Action
                    title="Preview Rows"
                    icon={Icon.Eye}
                    onAction={() => push(<QueryResult val={val} sql={`SELECT * FROM "${table}" LIMIT 50`} />)}
                  />
                  <Action
                    title="Run a Query"
                    icon={Icon.Terminal}
                    shortcut={Keyboard.Shortcut.Common.New}
                    onAction={() => push(<QueryForm val={val} initialSql={`SELECT * FROM "${table}" LIMIT 50`} />)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </>
      )}
    </List>
  );
}

function QueryForm({ val, initialSql }: { val: string; initialSql: string }) {
  const { push } = useNavigation();

  return (
    <Form
      navigationTitle={`Query · ${val}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run Query"
            icon={Icon.Play}
            onSubmit={(values: { sql: string }) => push(<QueryResult val={val} sql={values.sql} />)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="sql"
        title="SQL"
        defaultValue={initialSql}
        placeholder="SELECT * FROM …"
        enableMarkdown={false}
      />
      <Form.Description text="Read-only." />
    </Form>
  );
}

function QueryResult({ val, sql }: { val: string; sql: string }) {
  const readOnly = isSelect(sql);
  const { data, isLoading, error } = useCachedPromise(
    (identifier: string, statement: string) => sqliteExecute(identifier, statement),
    [val, sql],
    { execute: readOnly },
  );

  if (!readOnly) {
    return (
      <Detail
        navigationTitle="Not run"
        markdown={`## Read-only\n\nThis view only runs \`SELECT\` and \`WITH\` statements. Run writes on val.town.\n\n\`\`\`sql\n${sql}\n\`\`\``}
      />
    );
  }

  const markdown = error
    ? `## Query failed\n\n\`\`\`\n${errorMessage(error)}\n\`\`\``
    : [`\`\`\`sql\n${sql}\n\`\`\``, table(data)].join("\n\n");

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Result · ${val}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Sql" content={sql} />
          <Action.CopyToClipboard title="Copy Result as JSON" content={JSON.stringify(rowsOf(data), null, 2)} />
        </ActionPanel>
      }
    />
  );
}

/**
 * SQLite allows `WITH ... INSERT/UPDATE/DELETE`, so accepting any WITH-prefixed statement lets a CTE
 * smuggle a write through the read-only view. The statement is scanned outside strings and comments,
 * at parenthesis depth zero (CTE bodies live inside parens), and only a top-level SELECT survives.
 */
function isSelect(sql: string): boolean {
  const keywords: string[] = [];
  let depth = 0;
  let i = 0;

  while (i < sql.length) {
    const rest = sql.slice(i);
    if (rest.startsWith("--")) {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end + 1;
    } else if (rest.startsWith("/*")) {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
    } else if (sql[i] === "'" || sql[i] === '"' || sql[i] === "`") {
      const quote = sql[i];
      i += 1;
      while (i < sql.length && sql[i] !== quote) i += sql[i] === "\\" ? 2 : 1;
      i += 1;
    } else if (sql[i] === "(") {
      depth += 1;
      i += 1;
    } else if (sql[i] === ")") {
      depth = Math.max(0, depth - 1);
      i += 1;
    } else if (/[a-zA-Z_]/.test(sql[i])) {
      let j = i;
      while (j < sql.length && /\w/.test(sql[j])) j += 1;
      if (depth === 0) keywords.push(sql.slice(i, j).toLowerCase());
      i = j;
    } else {
      i += 1;
    }
  }

  if (keywords.length === 0) return false;
  if (keywords[0] === "select") return true;
  if (keywords[0] !== "with") return false;

  // A WITH statement is read-only only when its top-level verb is SELECT.
  const verbs = new Set([
    "select",
    "insert",
    "update",
    "delete",
    "replace",
    "create",
    "drop",
    "alter",
    "vacuum",
    "pragma",
    "attach",
    "reindex",
  ]);
  const verb = keywords.slice(1).find((word) => verbs.has(word));
  return verb === "select";
}

/** The val-scoped database answers with objects; the deprecated global one with arrays. */
function rowsOf(response: SqliteResponse | undefined): Record<string, unknown>[] {
  if (!response?.rows) return [];
  const columns = response.columns ?? [];
  return response.rows.map((row) =>
    Array.isArray(row) ? Object.fromEntries(row.map((value, index) => [columns[index] ?? index, value])) : row,
  );
}

function table(response: SqliteResponse | undefined): string {
  const rows = rowsOf(response);
  if (rows.length === 0)
    return `_No rows._ ${response?.rowsAffected ? `${response.rowsAffected} affected.` : ""}`.trim();

  const columns = response?.columns?.length ? response.columns : Object.keys(rows[0]);
  const header = `| ${columns.join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => cell(row[column])).join(" | ")} |`);

  return [header, divider, ...body].join("\n");
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
