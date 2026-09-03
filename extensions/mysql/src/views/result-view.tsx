import { Action, ActionPanel, Color, Detail, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { runQuery } from "../lib/client";
import type { Connection } from "../lib/connections";
import { isRows, summarizeWrite, toCsv, toJson, toMarkdownTable } from "../lib/format";
import { addHistory } from "../lib/history";

interface ResultViewProps {
  connection: Connection;
  sql: string;
}

export function ResultView({ connection, sql }: ResultViewProps) {
  const { data, isLoading, error } = usePromise(
    async () => {
      const result = await runQuery(connection, sql);
      await addHistory({ connectionId: connection.id, connectionName: connection.name, sql, ok: true });
      return result;
    },
    [],
    {
      onError: (e) => {
        showFailureToast(e, { title: "Query failed" });
        addHistory({ connectionId: connection.id, connectionName: connection.name, sql, ok: false });
      },
    },
  );

  const rows = data && isRows(data.rows) ? data.rows : [];
  const table = data ? (isRows(data.rows) ? toMarkdownTable(rows) : null) : null;

  let markdown = "";
  if (error) {
    markdown = `# Error\n\n\`\`\`\n${error.message}\n\`\`\``;
  } else if (data) {
    if (isRows(data.rows)) {
      markdown = `${table?.markdown ?? ""}${table?.truncated ? "\n\n_Showing the first 100 rows._" : ""}`;
    } else {
      markdown = `# Result\n\n${summarizeWrite(data.rows)}`;
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={connection.name}
      markdown={markdown}
      metadata={
        data ? (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Rows"
              text={isRows(data.rows) ? String(rows.length) : summarizeWrite(data.rows)}
            />
            <Detail.Metadata.Label title="Duration" text={`${data.durationMs} ms`} />
            <Detail.Metadata.TagList title="Connection">
              <Detail.Metadata.TagList.Item text={connection.name} color={Color.Blue} />
            </Detail.Metadata.TagList>
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {data && isRows(data.rows) && (
            <>
              <Action.CopyToClipboard
                title="Copy as JSON"
                content={toJson(rows)}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action.CopyToClipboard
                title="Copy as CSV"
                content={toCsv(rows)}
                shortcut={Keyboard.Shortcut.Common.CopyName}
              />
            </>
          )}
          <Action.CopyToClipboard title="Copy SQL" content={sql} />
        </ActionPanel>
      }
    />
  );
}
