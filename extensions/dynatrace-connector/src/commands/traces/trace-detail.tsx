import { Detail, Action, ActionPanel, Icon, Clipboard, showToast, Toast } from "@raycast/api";
import { Span, formatDuration } from "../../lib/types/span";
import type { TenantConfig } from "../../lib/auth";

interface TraceDetailProps {
  span: Span;
  tenant: TenantConfig;
}

export function TraceDetail({ span, tenant }: TraceDetailProps) {
  const deepLinkUrl = `${tenant.tenantEndpoint}/ui/apps/dynatrace.classic.distributed.tracing/ui/traces/${span.trace_id}`;

  const markdown = `
## Trace Information

**Trace ID**: \`${span.trace_id}\`
**Span ID**: \`${span.span_id}\`

### Span Details

- **Name**: ${span["span.name"]}
- **Service**: ${span["service.name"]}
- **Duration**: ${formatDuration(span["span.duration.us"])}
- **Status**: ${span.status_code === "ERROR" ? "🔴 ERROR" : "🟢 OK"}
- **Started**: ${new Date(span.timestamp).toLocaleString()}

### Timeline

- **Start**: ${new Date(span.timestamp).toISOString()}
- **Duration**: ${(span["span.duration.us"] / 1000000).toFixed(3)}s
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Dynatrace" url={deepLinkUrl} icon={Icon.Globe} />
          <Action
            title="Copy Trace ID"
            icon={Icon.CopyClipboard}
            onAction={async () => {
              await Clipboard.copy(span.trace_id);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied trace ID",
              });
            }}
          />
          <Action
            title="Copy Span ID"
            icon={Icon.CopyClipboard}
            onAction={async () => {
              await Clipboard.copy(span.span_id);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied span ID",
              });
            }}
          />
          <Action
            title="Copy Deep Link"
            icon={Icon.CopyClipboard}
            onAction={async () => {
              await Clipboard.copy(deepLinkUrl);
              await showToast({
                style: Toast.Style.Success,
                title: "Copied deep link",
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
