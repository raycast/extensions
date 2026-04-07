import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useEffect, useRef } from "react";
import {
  type AuditStatus,
  type SkillFrontmatter,
  AUDIT_PROVIDER_LABELS,
  buildInstallCommand,
  formatInstalls,
  normalizeAllowedTools,
  Skill,
  SkillAudit,
  SKILLS_BASE_URL,
} from "../shared";
import { useSkillContent } from "../hooks/useSkillContent";
import { useRepoStats, type RepoStats } from "../hooks/useRepoStats";
import { useSkillAudits } from "../hooks/useSkillAudits";
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

interface InlineDetailProps {
  skill: Skill;
  content: string | undefined;
  frontmatter: SkillFrontmatter;
  isLoading: boolean;
  stats: RepoStats | undefined;
  audits: {
    results: SkillAudit[];
    availabilityState?: SkillAuditsAvailabilityState;
    isLoading: boolean;
  };
}

function InlineDetail({ skill, content, frontmatter, isLoading, stats, audits }: InlineDetailProps) {
  const installCommand = buildInstallCommand(skill);
  const allowedTools = normalizeAllowedTools(frontmatter["allowed-tools"]);

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
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          {frontmatter.description && (
            <List.Item.Detail.Metadata.Label title="Description" text={frontmatter.description} />
          )}
          {frontmatter.description && <List.Item.Detail.Metadata.Separator />}
          <List.Item.Detail.Metadata.Label
            title="Installs"
            text={formatInstalls(skill.installs)}
            icon={Icon.Download}
          />
          {stats?.rateLimited ? (
            <List.Item.Detail.Metadata.Label title="GitHub Stars" text="Rate limited" icon={Icon.Warning} />
          ) : (
            stats?.stars !== undefined &&
            stats?.stars !== null && (
              <List.Item.Detail.Metadata.Label
                title="GitHub Stars"
                text={formatInstalls(stats.stars)}
                icon={Icon.Star}
              />
            )
          )}
          {frontmatter.license && (
            <List.Item.Detail.Metadata.Label title="License" text={frontmatter.license} icon={Icon.Document} />
          )}
          {frontmatter.compatibility && (
            <List.Item.Detail.Metadata.Label
              title="Compatibility"
              text={frontmatter.compatibility}
              icon={Icon.Checkmark}
            />
          )}
          {allowedTools.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Allowed Tools">
              {allowedTools.map((tool: string) => (
                <List.Item.Detail.Metadata.TagList.Item key={tool} text={tool} color={Color.Blue} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Link
            title="Repository"
            text={skill.source}
            target={`https://github.com/${skill.source}`}
          />
          <List.Item.Detail.Metadata.Link
            title="View on Skills"
            text={`${skill.source}/${skill.skillId}`}
            target={`${SKILLS_BASE_URL}/${skill.source}/${skill.skillId}`}
          />
          <List.Item.Detail.Metadata.Separator />
          {audits.results.length > 0 ? (
            audits.results.map((audit) =>
              audit.url ? (
                <List.Item.Detail.Metadata.Link
                  key={audit.provider}
                  title={`${AUDIT_PROVIDER_LABELS[audit.provider]} Audit`}
                  text={formatAuditStatus(audit.status)}
                  target={audit.url}
                />
              ) : (
                <List.Item.Detail.Metadata.Label
                  key={audit.provider}
                  title={`${AUDIT_PROVIDER_LABELS[audit.provider]} Audit`}
                  text={formatAuditStatus(audit.status)}
                />
              ),
            )
          ) : (
            <List.Item.Detail.Metadata.Label
              title="Security Audits"
              text={getAuditFallbackText(audits.isLoading, audits.availabilityState)}
            />
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Install Command" text={installCommand} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

interface SkillListItemProps {
  skill: Skill;
  rank?: number;
  isSelected: boolean;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
}

export function SkillListItem({ skill, rank, isSelected, isShowingDetail, onToggleDetail }: SkillListItemProps) {
  const title = rank !== undefined && rank !== null ? `#${rank} ${skill.name}` : skill.name;
  const { content, frontmatter, isLoading } = useSkillContent(skill, isSelected);
  const { stats } = useRepoStats(skill, isSelected);
  const audits = useSkillAudits(skill, {
    shouldFetch: isSelected,
  });

  const icon =
    rank !== undefined && rank !== null
      ? { source: Icon.Trophy, tintColor: rank <= 3 ? Color.Yellow : Color.SecondaryText }
      : { source: Icon.Hammer };

  const shownErrorTimestampRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (
      isSelected &&
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
  }, [audits.error, audits.errorDetails, audits.revalidate, isSelected, skill.name, skill.source, skill.skillId]);

  return (
    <List.Item
      title={title}
      subtitle={isShowingDetail ? undefined : (frontmatter.description ?? skill.source)}
      keywords={[skill.name, skill.source, skill.id]}
      icon={icon}
      accessories={isShowingDetail ? [] : [{ text: formatInstalls(skill.installs), icon: Icon.Download }]}
      id={skill.id}
      detail={
        <InlineDetail
          skill={skill}
          content={content}
          frontmatter={frontmatter}
          isLoading={isLoading}
          stats={stats}
          audits={{ results: audits.results, availabilityState: audits.availabilityState, isLoading: audits.isLoading }}
        />
      }
      actions={
        <ActionPanel>
          <InstallSkillAction skill={skill} prefetchedAuditResult={audits.result} />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={buildInstallCommand(skill)}
            icon={Icon.Terminal}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.OpenInBrowser title="Open Repository" url={`https://github.com/${skill.source}`} icon={Icon.Globe} />
          <Action.OpenInBrowser
            title="Open Skills"
            url={`${SKILLS_BASE_URL}/${skill.source}/${skill.skillId}`}
            icon={Icon.Link}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <OpenSecurityAuditActions audits={audits.results} />
          <Action
            title={isShowingDetail ? "Hide Detail Panel" : "Show Detail Panel"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
        </ActionPanel>
      }
    />
  );
}
