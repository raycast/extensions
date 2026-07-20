import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  Detail,
  useNavigation,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import {
  Connection,
  QueryResult,
  TableProNotInstalledError,
} from "./lib/types";
import { databaseTypeLabel, loadConnections } from "./lib/connections";
import { tableProInstalled } from "./lib/paths";
import { ScenarioEmptyView } from "./lib/empty-state";
import { classifyError } from "./lib/errors";
import { executeQuery, ProgressEvent } from "./lib/mcp";
import { openQueryDeeplink } from "./lib/deeplink";
import { isMutatingSQL, summarizeSQL } from "./lib/sql";

export default function RunQueryCommand() {
  const {
    data: connections,
    isLoading,
    error,
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

  if (isLoading || connections === undefined) {
    return <List isLoading />;
  }

  if (connections.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Plug}
          title="No connections yet"
          description="Add a connection in TablePro before running queries."
        />
      </List>
    );
  }

  return <QueryForm connections={connections} />;
}

function QueryForm({ connections }: { connections: Connection[] }) {
  const initialId = connections[0]?.id ?? "";
  const [connectionId, setConnectionId] = useState<string>(initialId);
  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Run Query"
            icon={Icon.Play}
            onSubmit={async (values: { connection: string; sql: string }) => {
              const trimmed = values.sql.trim();
              if (!trimmed) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "SQL is empty",
                });
                return;
              }
              const target = connections.find(
                (c) => c.id === values.connection,
              );
              if (!target) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Pick a connection",
                });
                return;
              }
              if (isMutatingSQL(trimmed)) {
                const confirmed = await confirmAlert({
                  title: `Run mutating query on ${target.name}?`,
                  message: summarizeSQL(trimmed),
                  primaryAction: {
                    title: "Run",
                    style: Alert.ActionStyle.Destructive,
                  },
                });
                if (!confirmed) return;
              }
              push(<RunningView connection={target} sql={trimmed} />);
            }}
          />
          <Action.SubmitForm
            title="Open Query in TablePro"
            icon={Icon.AppWindow}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
            onSubmit={async (values: { connection: string; sql: string }) => {
              const trimmed = values.sql.trim();
              if (!trimmed) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "SQL is empty",
                });
                return;
              }
              const target = connections.find(
                (c) => c.id === values.connection,
              );
              if (!target) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Pick a connection",
                });
                return;
              }
              try {
                await openQueryDeeplink(target.id, trimmed);
              } catch (err) {
                await showFailureToast(err, {
                  title: "Could not open query in TablePro",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="connection"
        title="Connection"
        value={connectionId}
        onChange={setConnectionId}
      >
        {connections.map((connection) => (
          <Form.Dropdown.Item
            key={connection.id}
            value={connection.id}
            title={connection.name}
            keywords={[
              connection.host ?? "",
              databaseTypeLabel(connection.type),
            ]}
          />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="sql"
        title="SQL"
        placeholder="-- Type SQL here"
        defaultValue=""
      />
      <Form.Description text="Mutating queries (INSERT, UPDATE, DELETE, etc.) ask for confirmation before running. The connection's external-access setting may still reject them." />
    </Form>
  );
}

function RunningView({
  connection,
  sql,
}: {
  connection: Connection;
  sql: string;
}) {
  const abortable = useRef<AbortController | null>(null);
  const progressToast = useRef<Toast | null>(null);
  const {
    data: result,
    isLoading,
    error,
  } = usePromise(
    async (id: string, q: string) => {
      progressToast.current = await showToast({
        style: Toast.Style.Animated,
        title: "Executing query…",
      });
      try {
        const queryResult = await executeQuery(id, q, {
          signal: abortable.current?.signal,
          onProgress: (event: ProgressEvent) => {
            const toast = progressToast.current;
            if (!toast) return;
            const percent =
              event.total && event.total > 0
                ? Math.round((event.progress / event.total) * 100)
                : undefined;
            const base = event.message ?? "Executing query";
            toast.title =
              percent !== undefined ? `${base} (${percent}%)` : base;
          },
        });
        if (progressToast.current) {
          progressToast.current.style = Toast.Style.Success;
          progressToast.current.title = "Query complete";
        }
        return queryResult;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          if (progressToast.current) {
            await progressToast.current.hide();
          }
          throw err;
        }
        if (progressToast.current) {
          progressToast.current.style = Toast.Style.Failure;
          progressToast.current.title = "Query failed";
        }
        throw err;
      }
    },
    [connection.id, sql],
    { abortable },
  );

  if (error) {
    return (
      <List>
        <ScenarioEmptyView scenario={classifyError(error)} />
      </List>
    );
  }

  if (isLoading || !result) {
    return (
      <Detail
        isLoading
        markdown={`Running on **${connection.name}**\n\n\`\`\`sql\n${sql}\n\`\`\``}
      />
    );
  }

  return <ResultView connection={connection} sql={sql} result={result} />;
}

function ResultView({
  connection,
  sql,
  result,
}: {
  connection: Connection;
  sql: string;
  result: QueryResult;
}) {
  if (result.error) {
    return (
      <Detail
        markdown={`# Query failed\n\n${result.error}\n\n\`\`\`sql\n${sql}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action
              title="Open in TablePro"
              icon={Icon.AppWindow}
              onAction={async () => {
                try {
                  await openQueryDeeplink(connection.id, sql);
                } catch (err) {
                  await showFailureToast(err, {
                    title: "Could not open query in TablePro",
                  });
                }
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!result.rows || result.rows.length === 0) {
    const summary =
      result.affectedRows !== undefined
        ? `${result.affectedRows.toLocaleString()} ${result.affectedRows === 1 ? "row" : "rows"} affected`
        : "Query returned no rows";
    return (
      <Detail
        markdown={`# ${summary}\n\nDuration: ${result.durationMs ?? 0} ms\n\n\`\`\`sql\n${sql}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action
              title="Open in TablePro"
              icon={Icon.AppWindow}
              onAction={async () => {
                try {
                  await openQueryDeeplink(connection.id, sql);
                } catch (err) {
                  await showFailureToast(err, {
                    title: "Could not open query in TablePro",
                  });
                }
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <RowsList connection={connection} sql={sql} result={result} />;
}

function RowsList({
  connection,
  sql,
  result,
}: {
  connection: Connection;
  sql: string;
  result: QueryResult;
}) {
  const totalRows = result.rows.length;
  const subtitleParts: string[] = [`${totalRows.toLocaleString()} rows`];
  if (result.durationMs !== undefined) {
    subtitleParts.push(`${Math.round(result.durationMs)} ms`);
  }
  if (result.isTruncated) {
    subtitleParts.push(`capped (open in TablePro for full result)`);
  }
  const sectionTitle = subtitleParts.join(" · ");

  const sharedActions = (
    <>
      <Action
        title="Open in TablePro"
        icon={Icon.AppWindow}
        onAction={async () => {
          try {
            await openQueryDeeplink(connection.id, sql);
          } catch (err) {
            await showFailureToast(err, {
              title: "Could not open query in TablePro",
            });
          }
        }}
      />
      <Action.Push
        title="Show as Table"
        icon={Icon.AppWindow}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        target={
          <TableMarkdownView
            connection={connection}
            sql={sql}
            result={result}
          />
        }
      />
      <Action.CopyToClipboard
        title="Copy All as JSON"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
        content={JSON.stringify(
          { columns: result.columns, rows: result.rows },
          null,
          2,
        )}
      />
      <Action.CopyToClipboard
        title="Copy All as CSV"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
        content={resultToCSV(result)}
      />
      <Action.CopyToClipboard
        title="Copy SQL"
        content={sql}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      />
    </>
  );

  return (
    <List
      isShowingDetail
      navigationTitle={connection.name}
      searchBarPlaceholder={`Filter ${totalRows.toLocaleString()} rows`}
    >
      <List.Section title={sectionTitle}>
        {result.rows.map((row, index) => {
          const accessories: List.Item.Accessory[] = [];
          if (index === 0 && result.isTruncated) {
            accessories.push({
              tag: { value: "Capped", color: Color.Orange },
              tooltip:
                "Result was capped by TablePro. Open in TablePro for the full grid.",
            });
          }
          return (
            <List.Item
              key={index}
              title={`#${index + 1}`}
              accessories={accessories}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      {result.columns.map((col) => (
                        <List.Item.Detail.Metadata.Label
                          key={col}
                          title={col}
                          text={formatDetail(row[col])}
                        />
                      ))}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  {sharedActions}
                  <Action.CopyToClipboard
                    title="Copy Row as JSON"
                    content={JSON.stringify(row, null, 2)}
                    shortcut={{ modifiers: ["cmd"], key: "j" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function TableMarkdownView({
  connection,
  sql,
  result,
}: {
  connection: Connection;
  sql: string;
  result: QueryResult;
}) {
  const markdown = renderMarkdownTable(result);
  return (
    <Detail
      navigationTitle={`${connection.name} · table view`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open in TablePro"
            icon={Icon.AppWindow}
            onAction={async () => {
              try {
                await openQueryDeeplink(connection.id, sql);
              } catch (err) {
                await showFailureToast(err, {
                  title: "Could not open query in TablePro",
                });
              }
            }}
          />
          <Action.CopyToClipboard
            title="Copy Markdown"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

const MARKDOWN_TABLE_ROW_LIMIT = 50;

function renderMarkdownTable(result: QueryResult): string {
  const { columns, rows } = result;
  if (columns.length === 0) {
    return "_No columns returned._";
  }
  const visibleRows = rows.slice(0, MARKDOWN_TABLE_ROW_LIMIT);
  const header = `| ${columns.map(escapeMarkdownCell).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = visibleRows
    .map((row) => {
      const cells = columns.map((col) =>
        escapeMarkdownCell(formatInline(row[col])),
      );
      return `| ${cells.join(" | ")} |`;
    })
    .join("\n");
  const note: string[] = [];
  if (rows.length > MARKDOWN_TABLE_ROW_LIMIT) {
    note.push(
      `_Showing first ${MARKDOWN_TABLE_ROW_LIMIT} of ${rows.length.toLocaleString()} rows. Open in TablePro for the full grid._`,
    );
  } else if (result.isTruncated) {
    note.push(
      `_Result was capped by TablePro. Open in TablePro for the full grid._`,
    );
  }
  return [header, separator, body, "", ...note].join("\n");
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function resultToCSV(result: QueryResult): string {
  const lines: string[] = [];
  lines.push(result.columns.map(escapeCsvCell).join(","));
  for (const row of result.rows) {
    lines.push(
      result.columns
        .map((col) => escapeCsvCell(stringifyCell(row[col])))
        .join(","),
    );
  }
  return lines.join("\n");
}

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatInline(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value.replace(/\s+/g, " ").slice(0, 80);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value).slice(0, 80);
  } catch {
    return "(unprintable)";
  }
}

function formatDetail(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "(unprintable)";
  }
}
