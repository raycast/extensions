import { Detail, ActionPanel, Action } from "@raycast/api";
import { LogEntry, Tenant } from "../utils/types";
import { escapeTableCell, formatDateTime } from "../utils/formatting";

interface LogDetailProps {
  log: LogEntry;
  tenant: Tenant;
}

/** Detail view showing all fields of a single log entry with a raw JSON details section. */
export default function LogDetail({ log, tenant }: LogDetailProps) {
  const location =
    [log.location_info?.city_name, log.location_info?.country_name].filter(Boolean).join(", ") || "\u2014";

  const markdown = `# Log Entry

| Field | Value |
|---|---|
| **Log ID** | ${escapeTableCell(log.log_id || "\u2014")} |
| **Type** | ${escapeTableCell(log.type || "\u2014")} |
| **Description** | ${escapeTableCell(log.description || "\u2014")} |
| **Date** | ${formatDateTime(log.date)} |
| **User** | ${escapeTableCell(log.user_name || log.user_id || "\u2014")} |
| **Client** | ${escapeTableCell(log.client_name || log.client_id || "\u2014")} |
| **Connection** | ${escapeTableCell(log.connection || "\u2014")} |
| **IP** | ${escapeTableCell(log.ip || "\u2014")} |
| **User Agent** | ${escapeTableCell(log.user_agent || "\u2014")} |
| **Location** | ${escapeTableCell(location)} |

## Details

\`\`\`json
${JSON.stringify(log.details, null, 2) || "{}"}
\`\`\`
`;

  const dashboardUrl = `https://${tenant.domain}/admin/logs/${log.log_id || ""}`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Log: ${log.type || "Unknown"}`}
      actions={
        <ActionPanel>
          {log.log_id && (
            <Action.CopyToClipboard
              title="Copy Log ID"
              content={log.log_id}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          )}
          {log.user_id && (
            <Action.CopyToClipboard
              title="Copy User ID"
              content={log.user_id}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          )}
          <Action.OpenInBrowser
            title="Open in Auth0 Dashboard"
            url={dashboardUrl}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard
            title="Copy Log JSON"
            content={JSON.stringify(log, null, 2)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
