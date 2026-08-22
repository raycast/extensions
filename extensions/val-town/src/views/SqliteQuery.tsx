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

function isSelect(sql: string): boolean {
  return /^\s*(select|with)\b/i.test(sql);
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
