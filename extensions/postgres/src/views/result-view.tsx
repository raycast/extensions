import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import type { QueryResult } from "../lib/client";
import { toCsv, toJson, toMarkdownTable } from "../lib/format";

const PREVIEW_ROWS = 100;

export function ResultView({
  result,
  sql,
  connectionName,
}: {
  result: QueryResult;
  sql: string;
  connectionName: string;
}) {
  const { markdown, truncated } = toMarkdownTable(result.rows, PREVIEW_ROWS);
  const hasRows = result.rows.length > 0;

  // Two caps can bite: the Row Limit preference, applied when the rows were fetched, and the
  // preview cap on how many of those are rendered as a table. Say which one is in play.
  const note = result.truncated
    ? `\n_Showing ${Math.min(PREVIEW_ROWS, result.rows.length)} of ${result.totalRows} rows — the Row Limit preference kept the first ${result.rows.length}._`
    : truncated
      ? `\n_Showing the first ${PREVIEW_ROWS} of ${result.rows.length} rows._`
      : "";

  const body = hasRows
    ? [markdown, note].join("\n")
    : `### ${result.command || "OK"}${result.rowCount === null ? "" : ` ${result.rowCount}`}\n\nThe statement returned no rows.`;

  return (
    <Detail
      markdown={body}
      navigationTitle={`${result.totalRows} row${result.totalRows === 1 ? "" : "s"} · ${result.durationMs} ms`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Connection" text={connectionName} />
          <Detail.Metadata.Label title="Command" text={result.command || "—"} />
          <Detail.Metadata.Label
            title="Rows"
            text={result.truncated ? `${result.rows.length} of ${result.totalRows}` : String(result.totalRows)}
          />
          <Detail.Metadata.Label title="Duration" text={`${result.durationMs} ms`} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {hasRows && <Action.CopyToClipboard title="Copy as JSON" content={toJson(result.rows)} icon={Icon.Code} />}
          {hasRows && <Action.CopyToClipboard title="Copy as CSV" content={toCsv(result.rows)} icon={Icon.Document} />}
          {hasRows && <Action.CopyToClipboard title="Copy as Markdown Table" content={markdown} icon={Icon.Text} />}
          <Action.CopyToClipboard title="Copy Statement" content={sql} icon={Icon.Clipboard} />
        </ActionPanel>
      }
    />
  );
}
