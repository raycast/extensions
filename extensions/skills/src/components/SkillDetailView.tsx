import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useRef } from "react";
import {
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
import { formatAuditStatus, getAuditFallbackText } from "../utils/skill-audit-display";
import { showSkillAuditErrorToast } from "../utils/skill-audit-error-toast";
import { fetchSkillContent } from "../hooks/skill-content";
import { CopySkillContentsAction } from "./actions/CopySkillContentsAction";
import { InstallSkillAction } from "./actions/InstallSkillAction";
import { OpenSecurityAuditActions } from "./actions/OpenSecurityAuditActions";
import { joinMetadataSections, type MetadataSection } from "./_common/metadata";

interface SkillDetailViewProps {
  skill: Skill;
  onSkillInstalled?: () => void | Promise<void>;
}

export function SkillDetailView({ skill, onSkillInstalled }: SkillDetailViewProps) {
  const { getInstalledMatch, revalidate: revalidateInstalledSkillMatches } = useInstalledSkillMatches();
  const installedMatch = getInstalledMatch(skill);
  const { content, rawContent, frontmatter, isLoading } = useSkillContent(skill, true);
  const { stats } = useRepoStats(skill, true);
  const audits = useSkillAudits(skill, {
    shouldFetch: true,
  });
  const installCommand = buildInstallCommand(skill);
  const allowedTools = normalizeAllowedTools(frontmatter["allowed-tools"]);
  const shownErrorTimestampRef = useRef<string | undefined>(undefined);
  const skillUrl = buildSkillUrl(skill);

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

  const installationDetailsSection: MetadataSection = [
    installedMatch.type === "exact" && (
      <Detail.Metadata.TagList key="installation-status" title="Installation">
        <Detail.Metadata.TagList.Item text="Installed" color={Color.Green} />
      </Detail.Metadata.TagList>
    ),
    installedMatch.type === "conflict" && (
      <Detail.Metadata.TagList key="installation-status" title="Installation">
        <Detail.Metadata.TagList.Item text="Different Source" color={Color.Orange} />
      </Detail.Metadata.TagList>
    ),
    installedMatch.type === "conflict" && (
      <Detail.Metadata.Label
        key="installation-source"
        title="Installed Source"
        text={installedMatch.source ?? "Unknown source"}
      />
    ),
    installedMatch.type !== "none" && installedMatch.agents.length > 0 && (
      <Detail.Metadata.TagList key="installation-agents" title="Agents">
        {installedMatch.agents.map((agent) => (
          <Detail.Metadata.TagList.Item key={agent} text={agent} color={Color.Blue} />
        ))}
      </Detail.Metadata.TagList>
    ),
  ];

  const frontmatterDetailsSection: MetadataSection = [
    frontmatter.description && (
      <Detail.Metadata.Label key="frontmatter-description" title="Description" text={frontmatter.description} />
    ),
    frontmatter.license && (
      <Detail.Metadata.Label
        key="frontmatter-license"
        title="License"
        text={frontmatter.license}
        icon={Icon.Document}
      />
    ),
    frontmatter.compatibility && (
      <Detail.Metadata.Label
        key="frontmatter-compatibility"
        title="Compatibility"
        text={frontmatter.compatibility}
        icon={Icon.Checkmark}
      />
    ),
    allowedTools.length > 0 && (
      <Detail.Metadata.TagList key="frontmatter-allowed-tools" title="Allowed Tools">
        {allowedTools.map((tool) => (
          <Detail.Metadata.TagList.Item key={tool} text={tool} color={Color.Blue} />
        ))}
      </Detail.Metadata.TagList>
    ),
  ];

  const statsDetailsSection: MetadataSection = [
    <Detail.Metadata.Label
      key="stats-installs"
      title="Installs"
      text={formatInstalls(skill.installs)}
      icon={Icon.Download}
    />,
    stats?.rateLimited ? (
      <Detail.Metadata.Label key="stats-github-stars" title="GitHub Stars" text="Rate limited" icon={Icon.Warning} />
    ) : (
      stats?.stars !== undefined &&
      stats?.stars !== null && (
        <Detail.Metadata.Label
          key="stats-github-stars"
          title="GitHub Stars"
          text={formatInstalls(stats.stars)}
          icon={Icon.Star}
        />
      )
    ),
    !stats?.rateLimited && stats?.pushedAt && (
      <Detail.Metadata.Label
        key="stats-repo-activity"
        title="Repo Activity"
        text={formatRelativeDate(stats.pushedAt)}
        icon={Icon.Calendar}
      />
    ),
  ];

  const repositoryDetailsSection: MetadataSection = [
    <Detail.Metadata.Link
      key="repository-skills"
      title="skills.sh"
      text={`${skill.source}/${skill.skillId}`}
      target={skillUrl}
    />,
    <Detail.Metadata.Link
      key="repository-github"
      title="Repository"
      text={skill.source}
      target={`https://github.com/${skill.source}`}
    />,
  ];

  const agentAuditsDetailsSection: MetadataSection = [
    audits.results.length > 0 ? (
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
        key="agent-audits-fallback"
        title="Security Audits"
        text={getAuditFallbackText(audits.isLoading, audits.availabilityState)}
      />
    ),
  ];

  const installCommandDetailsSection: MetadataSection = [
    <Detail.Metadata.Label key="install-command" title="Install Command" text={installCommand} />,
  ];

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={skill.name}
      metadata={
        <Detail.Metadata>
          {joinMetadataSections(
            [
              installationDetailsSection,
              frontmatterDetailsSection,
              statsDetailsSection,
              repositoryDetailsSection,
              agentAuditsDetailsSection,
              installCommandDetailsSection,
            ],
            Detail.Metadata.Separator,
          )}
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
          <CopySkillContentsAction
            content={rawContent}
            loadContent={() => fetchSkillContent(skill).then((result) => result?.raw)}
          />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={buildInstallCommand(skill)}
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
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
