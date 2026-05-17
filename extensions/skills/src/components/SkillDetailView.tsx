import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useRef } from "react";
import {
  type AuditStatus,
  AUDIT_PROVIDER_LABELS,
  buildInstallCommand,
  buildSkillUrl,
  formatInstalls,
  formatRelativeDate,
  normalizeAllowedTools,
  type Skill,
} from "../shared";
import { useRepoStats } from "../hooks/useRepoStats";
import { useSkillAudits } from "../hooks/useSkillAudits";
import { useSkillContent } from "../hooks/useSkillContent";
import { useInstalledSkillMatches } from "../hooks/useInstalledSkillMatches";
import { type SkillAuditsAvailabilityState } from "../utils/skill-audits";
import { showSkillAuditErrorToast } from "../utils/skill-audit-error-toast";
import { InstallSkillAction } from "./actions/InstallSkillAction";
import { OpenSecurityAuditActions } from "./actions/OpenSecurityAuditActions";

const AUDIT_STATUS_META: Record<AuditStatus, { emoji: string; label: string }> = {
  pass: { emoji: "✅", label: "Pass" },
  warn: { emoji: "⚠️", label: "Warn" },
  fail: { emoji: "🛑", label: "Fail" },
  unknown: { emoji: "", label: "Unknown" },
};

function formatAuditStatus(status: AuditStatus): string {
  const { emoji, label } = AUDIT_STATUS_META[status];
  return emoji ? `${emoji} ${label}` : label;
}

function getAuditFallbackText(isLoading: boolean, availabilityState?: SkillAuditsAvailabilityState): string {
  if (isLoading) return "Loading...";
  if (availabilityState === "parse-error" || availabilityState === "fetch-error") return "Unable to verify";
  return "Pending";
}

interface SkillDetailViewProps {
  skill: Skill;
  onSkillInstalled?: () => void | Promise<void>;
}

export function SkillDetailView({ skill, onSkillInstalled }: SkillDetailViewProps) {
  const { getInstalledMatch, revalidate: revalidateInstalledSkillMatches } = useInstalledSkillMatches();
  const installedMatch = getInstalledMatch(skill);
  const { content, frontmatter, isLoading } = useSkillContent(skill, true);
  const { stats } = useRepoStats(skill, true);
  const audits = useSkillAudits(skill, {
    shouldFetch: true,
  });
  const installCommand = buildInstallCommand(skill);
  const allowedTools = normalizeAllowedTools(frontmatter["allowed-tools"]);
  const shownErrorTimestampRef = useRef<string | undefined>(undefined);
  const skillUrl = buildSkillUrl(skill.source, skill.skillId);

  const refreshSkillStatus = useCallback(async () => {
    await Promise.all([revalidateInstalledSkillMatches(), onSkillInstalled?.()]);
  }, [revalidateInstalledSkillMatches, onSkillInstalled]);

  useEffect(() => {
    if (
      audits.errorDetails !== undefined &&
      audits.errorDetails.skillSource === skill.source &&
      audits.errorDetails.skillId === skill.skillId &&
      audits.errorDetails.timestamp !== shownErrorTimestampRef.current
    ) {
      shownErrorTimestampRef.current = audits.errorDetails.timestamp;
      void showSkillAuditErrorToast({
        error: audits.error ?? new Error("Unknown error"),
        errorDetails: audits.errorDetails,
        skillName: skill.name,
        onRetry: audits.revalidate,
      });
    }
  }, [audits.error, audits.errorDetails, audits.revalidate, skill.name, skill.source, skill.skillId]);

  const markdown = isLoading
    ? `# ${skill.name}\n\nLoading...`
    : content
      ? content
      : `# ${skill.name}

**Repository:** [${skill.source}](https://github.com/${skill.source})

**Installs:** ${formatInstalls(skill.installs)}

---

\`\`\`bash
${installCommand}
\`\`\`
`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={skill.name}
      metadata={
        <Detail.Metadata>
          {installedMatch.type === "exact" && (
            <Detail.Metadata.TagList title="Installation">
              <Detail.Metadata.TagList.Item text="Installed" color={Color.Green} />
            </Detail.Metadata.TagList>
          )}
          {installedMatch.type === "conflict" && (
            <Detail.Metadata.TagList title="Installation">
              <Detail.Metadata.TagList.Item text="Different Source" color={Color.Orange} />
            </Detail.Metadata.TagList>
          )}
          {installedMatch.type === "conflict" && (
            <Detail.Metadata.Label title="Installed Source" text={installedMatch.source ?? "Unknown source"} />
          )}
          {installedMatch.type !== "none" && installedMatch.agents.length > 0 && (
            <Detail.Metadata.TagList title="Agents">
              {installedMatch.agents.map((agent) => (
                <Detail.Metadata.TagList.Item key={agent} text={agent} color={Color.Blue} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {installedMatch.type !== "none" && <Detail.Metadata.Separator />}
          {frontmatter.description && <Detail.Metadata.Label title="Description" text={frontmatter.description} />}
          {frontmatter.description && <Detail.Metadata.Separator />}
          <Detail.Metadata.Label title="Installs" text={formatInstalls(skill.installs)} icon={Icon.Download} />
          {stats?.rateLimited ? (
            <Detail.Metadata.Label title="GitHub Stars" text="Rate limited" icon={Icon.Warning} />
          ) : (
            stats?.stars !== undefined &&
            stats?.stars !== null && (
              <Detail.Metadata.Label title="GitHub Stars" text={formatInstalls(stats.stars)} icon={Icon.Star} />
            )
          )}
          {!stats?.rateLimited && stats?.pushedAt && (
            <Detail.Metadata.Label
              title="Repo Activity"
              text={formatRelativeDate(stats.pushedAt)}
              icon={Icon.Calendar}
            />
          )}
          {frontmatter.license && (
            <Detail.Metadata.Label title="License" text={frontmatter.license} icon={Icon.Document} />
          )}
          {frontmatter.compatibility && (
            <Detail.Metadata.Label title="Compatibility" text={frontmatter.compatibility} icon={Icon.Checkmark} />
          )}
          {allowedTools.length > 0 && (
            <Detail.Metadata.TagList title="Allowed Tools">
              {allowedTools.map((tool: string) => (
                <Detail.Metadata.TagList.Item key={tool} text={tool} color={Color.Blue} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="skills.sh" text={`${skill.source}/${skill.skillId}`} target={skillUrl} />
          <Detail.Metadata.Link title="Repository" text={skill.source} target={`https://github.com/${skill.source}`} />
          <Detail.Metadata.Separator />
          {audits.results.length > 0 ? (
            audits.results.map((audit) =>
              audit.url ? (
                <Detail.Metadata.Link
                  key={audit.provider}
                  title={`${AUDIT_PROVIDER_LABELS[audit.provider]} Audit`}
                  text={formatAuditStatus(audit.status)}
                  target={audit.url}
                />
              ) : (
                <Detail.Metadata.Label
                  key={audit.provider}
                  title={`${AUDIT_PROVIDER_LABELS[audit.provider]} Audit`}
                  text={formatAuditStatus(audit.status)}
                />
              ),
            )
          ) : (
            <Detail.Metadata.Label
              title="Security Audits"
              text={getAuditFallbackText(audits.isLoading, audits.availabilityState)}
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Install Command" text={installCommand} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <InstallSkillAction
            skill={skill}
            installedMatch={installedMatch}
            prefetchedAuditResult={audits.result}
            onSkillInstalled={refreshSkillStatus}
          />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={buildInstallCommand(skill)}
            icon={Icon.Terminal}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.OpenInBrowser
            title="Open on skills.sh"
            url={skillUrl}
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.OpenInBrowser
            title="Open Repository"
            url={`https://github.com/${skill.source}`}
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
          <OpenSecurityAuditActions audits={audits.results} />
        </ActionPanel>
      }
    />
  );
}
