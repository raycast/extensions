import { Action, ActionPanel, Icon } from "@raycast/api";
import { AUDIT_PROVIDER_LABELS, type SkillAudit } from "../../shared";

interface OpenSecurityAuditActionsProps {
  audits: SkillAudit[];
}

export function OpenSecurityAuditActions({ audits }: OpenSecurityAuditActionsProps) {
  const openableAudits = audits.filter((audit): audit is SkillAudit & { url: string } => Boolean(audit.url));

  if (openableAudits.length === 0) {
    return null;
  }

  return (
    <ActionPanel.Section title="Security Audits">
      {openableAudits.map((audit) => (
        <Action.OpenInBrowser
          key={audit.provider}
          title={`Open ${AUDIT_PROVIDER_LABELS[audit.provider]} Audit`}
          url={audit.url}
          icon={Icon.Shield}
        />
      ))}
    </ActionPanel.Section>
  );
}
