import { Action, Detail, Icon } from "@raycast/api";
import { escape, statusMarkdown } from "../lib/report";
import { AuditActions } from "./audit-actions";
import { ChangeHistory } from "./extension-detail";
import { useAudit } from "./use-audit";

export function AuditStatus() {
  const audit = useAudit(false, false);
  const markdown = `${audit.error ? `# Audit Needs Attention\n\n${escape(audit.error.message)}\n\n` : ""}${statusMarkdown(audit.state)}`;
  return (
    <Detail
      isLoading={audit.loading}
      markdown={markdown}
      actions={
        <AuditActions audit={audit}>
          <Action.Push title="Show Change History" icon={Icon.Clock} target={<ChangeHistory />} />
          <Action.CopyToClipboard title="Copy Audit Diagnostics" content={markdown} />
        </AuditActions>
      }
    />
  );
}
