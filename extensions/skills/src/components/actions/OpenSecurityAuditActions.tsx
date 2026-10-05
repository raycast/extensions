import { Action, ActionPanel, Icon } from "@raycast/api";
import { formatAuditProviderLabel, type SkillAudit } from "../../shared";

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
          title={`Open ${formatAuditProviderLabel(audit)} Audit`}
          url={audit.url}
          icon={Icon.Shield}
        />
      ))}
    </ActionPanel.Section>
  );
}
