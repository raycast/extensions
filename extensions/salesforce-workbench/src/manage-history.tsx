import { Action, ActionPanel, Alert, Color, Icon, List, Toast, confirmAlert, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { clearHistory, getHistory, markQuerySaved } from "./storage";
import { HistoryEntry, QueryHistoryEntry } from "./types";

const DETAIL_JSON_LIMIT = 12_000;
const QUERY_PREVIEW_ROWS = 5;

function jsonPreview(value: unknown, limit = DETAIL_JSON_LIMIT): string {
  const json = JSON.stringify(value, null, 2);
  return json.length <= limit ? json : `${json.slice(0, limit)}\n… preview truncated`;
}

export function historyMarkdown(entry: HistoryEntry): string {
  if (entry.kind === "query") {
    const snapshotNote = entry.resultTruncated
      ? `The saved snapshot is truncated. ${entry.records.length} of ${entry.rowCount} rows are stored locally.`
      : `${entry.records.length} of ${entry.rowCount} rows are stored locally.`;
    const exportNote = entry.exportedFile ? `\n\n**Exported file:** \`${entry.exportedFile}\`` : "";
    const preview = entry.records.slice(0, QUERY_PREVIEW_ROWS);

    return `# ${entry.mode.toUpperCase()} Query

| Property | Value |
| --- | --- |
| Org | ${entry.orgAlias} |
| Run | ${new Date(entry.timestamp).toLocaleString()} |
| Rows | ${entry.rowCount} |
| Tooling API | ${entry.toolingApi ? "Yes" : "No"} |
| Include deleted | ${entry.allRows ? "Yes" : "No"} |

## Query

\`\`\`${entry.mode === "soql" ? "sql" : "text"}
${entry.text}
\`\`\`

## Result snapshot

${snapshotNote}${exportNote}

Showing the first ${Math.min(preview.length, QUERY_PREVIEW_ROWS)} saved rows. Use **Copy History JSON** for the complete saved entry.

\`\`\`json
${jsonPreview(preview)}
\`\`\``;
  }

  return `# ${entry.action.toUpperCase()} ${entry.objectApiName}

| Property | Value |
| --- | --- |
| Org | ${entry.orgAlias} |
| Run | ${new Date(entry.timestamp).toLocaleString()} |
| Record ID | ${entry.recordId ?? "Not available"} |
| Status | ${entry.success ? "Succeeded" : "Failed"} |

${entry.error ? `## Salesforce error\n\n${entry.error}\n\n` : ""}## Before

\`\`\`json
${jsonPreview(entry.before)}
\`\`\`

## After

\`\`\`json
${jsonPreview(entry.after)}
\`\`\``;
}

export default function ManageHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    setEntries(await getHistory());
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const clear = async (kind?: HistoryEntry["kind"]) => {
    const confirmed = await confirmAlert({
      title: `Clear ${kind ?? "all"} history?`,
      message: "This removes the encrypted local history from Raycast and cannot be undone.",
      primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await clearHistory(kind);
    await load();
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  };

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search query and mutation history…">
      {entries.map((entry) => {
        const title =
          entry.kind === "query"
            ? entry.text.replace(/\s+/g, " ")
            : `${entry.action.toUpperCase()} ${entry.objectApiName}${entry.recordId ? ` · ${entry.recordId}` : ""}`;
        const detail = historyMarkdown(entry);
        return (
          <List.Item
            key={entry.id}
            icon={{
              source: entry.kind === "query" ? (entry.saved ? Icon.Star : Icon.Terminal) : Icon.Pencil,
              tintColor: entry.kind === "mutation" && !entry.success ? Color.Red : undefined,
            }}
            title={title}
            subtitle={`${entry.orgAlias} · ${entry.kind}`}
            accessories={[{ date: new Date(entry.timestamp) }]}
            detail={<List.Item.Detail markdown={detail} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy History JSON" content={JSON.stringify(entry, null, 2)} />
                {entry.kind === "query" ? (
                  <Action.CopyToClipboard title="Copy Query Text" content={entry.text} />
                ) : null}
                {entry.kind === "query" && !entry.saved ? (
                  <Action
                    title="Save Query"
                    icon={Icon.Star}
                    onAction={async () => {
                      await markQuerySaved(entry as QueryHistoryEntry);
                      await load();
                    }}
                  />
                ) : null}
                <Action title="Clear Query History" icon={Icon.Trash} onAction={() => clear("query")} />
                <Action title="Clear Mutation History" icon={Icon.Trash} onAction={() => clear("mutation")} />
                <Action title="Clear All History" icon={Icon.Trash} onAction={() => clear()} />
              </ActionPanel>
            }
          />
        );
      })}
      {!isLoading && !entries.length ? <List.EmptyView title="No Salesforce Workbench history" /> : null}
    </List>
  );
}
