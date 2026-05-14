import { ActionPanel, Action, Icon, Keyboard, List, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { useSkillAudits } from "../hooks/useSkillAudits";
import {
  type InstalledSkill,
  type Skill,
  AUDIT_PROVIDER_LABELS,
  buildSkillUrl,
  isGithubBackedInstalledSkill,
  parseFrontmatter,
} from "../shared";
import type { MutateSkills } from "../hooks/useInstalledSkills";
import { formatAuditStatus, getAuditFallbackText } from "../utils/skill-audit-display";
import { OpenSecurityAuditActions } from "./actions/OpenSecurityAuditActions";
import { RemoveSkillAction } from "./actions/RemoveSkillAction";
import { UpdateSkillAction } from "./actions/UpdateSkillAction";
import { joinMetadataSections, type MetadataSection } from "./_common/metadata";

function formatDate(iso: string): string | undefined {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

interface InlineDetailProps {
  skill: InstalledSkill;
  isSelected: boolean;
  skillDetailPageUrl?: string;
  audits?: ReturnType<typeof useSkillAudits>;
}

function InlineDetail({ skill, isSelected, skillDetailPageUrl, audits }: InlineDetailProps) {
  const { data: parsedSkillMarkdown, isLoading } = useCachedPromise(
    async (path: string) => {
      const raw = await readFile(join(path, "SKILL.md"), "utf-8");
      return parseFrontmatter(raw);
    },
    [skill.path],
    { execute: isSelected },
  );

  const markdown = isLoading
    ? `# ${skill.name}\n\nLoading...`
    : (parsedSkillMarkdown?.body ?? `# ${skill.name}\n\nNo SKILL.md found.`);

  const frontmatter = parsedSkillMarkdown?.frontmatter ?? {};

  const frontmatterDetailsSection: MetadataSection = [
    frontmatter.description && (
      <List.Item.Detail.Metadata.Label
        key="frontmatter-description"
        title="Description"
        text={frontmatter.description}
      />
    ),
    frontmatter.license && (
      <List.Item.Detail.Metadata.Label
        key="frontmatter-license"
        title="License"
        text={frontmatter.license}
        icon={Icon.Document}
      />
    ),
  ];

  const installedDate = skill.installedAt ? formatDate(skill.installedAt) : undefined;
  const updatedDate = skill.updatedAt ? formatDate(skill.updatedAt) : undefined;
  const repositoryUrl = skill.sourceUrl;
  const repositoryText = skill.source ?? skill.sourceUrl;

  const updateStatusDetailsSection: MetadataSection = [
    skill.hasUpdate && (
      <List.Item.Detail.Metadata.TagList key="skill-lock-status" title="Status">
        <List.Item.Detail.Metadata.TagList.Item text="Update available" color={Color.Orange} />
      </List.Item.Detail.Metadata.TagList>
    ),
  ];

  const localInfoDetailsSection: MetadataSection = [
    installedDate && (
      <List.Item.Detail.Metadata.Label
        key="skill-lock-installed"
        title="Installed"
        text={installedDate}
        icon={Icon.Calendar}
      />
    ),
    updatedDate && (
      <List.Item.Detail.Metadata.Label key="skill-lock-updated" title="Updated" text={updatedDate} icon={Icon.Clock} />
    ),
    <List.Item.Detail.Metadata.TagList key="local-info-agents" title="Agents">
      {skill.agents.map((agent) => (
        <List.Item.Detail.Metadata.TagList.Item key={agent} text={agent} color={Color.Blue} />
      ))}
    </List.Item.Detail.Metadata.TagList>,
    <List.Item.Detail.Metadata.Label key="local-info-path" title="Path" text={skill.path} />,
  ];

  const linkDetailsSection: MetadataSection = [
    skill.source && skillDetailPageUrl && (
      <List.Item.Detail.Metadata.Link
        key="skill-lock-skills"
        title="skills.sh"
        text={`${skill.source}/${skill.name}`}
        target={skillDetailPageUrl}
      />
    ),
    repositoryUrl && repositoryText && (
      <List.Item.Detail.Metadata.Link
        key="skill-lock-repository"
        title="Repository"
        text={repositoryText}
        target={repositoryUrl}
      />
    ),
  ];

  const sourceAudits = skill.source ? audits : undefined;
  const shouldShowAuditScopeWarning = skill.hasUpdate && sourceAudits;
  const agentAuditsDetailsSection: MetadataSection = [
    shouldShowAuditScopeWarning && (
      <List.Item.Detail.Metadata.Label
        key="agent-audits-scope"
        title="Audit Scope"
        text="Results apply to the latest version available via update."
        icon={Icon.Warning}
      />
    ),
    sourceAudits &&
      (sourceAudits.results.length > 0 ? (
        sourceAudits.results.map((audit) =>
          audit.url ? (
            <List.Item.Detail.Metadata.Link
              key={`agent-audits-${audit.provider}`}
              title={`${AUDIT_PROVIDER_LABELS[audit.provider]} Audit`}
              text={formatAuditStatus(audit.status)}
              target={audit.url}
            />
          ) : (
            <List.Item.Detail.Metadata.Label
              key={`agent-audits-${audit.provider}`}
              title={`${AUDIT_PROVIDER_LABELS[audit.provider]} Audit`}
              text={formatAuditStatus(audit.status)}
            />
          ),
        )
      ) : (
        <List.Item.Detail.Metadata.Label
          key="agent-audits-fallback"
          title="Security Audits"
          text={getAuditFallbackText(sourceAudits.isLoading, sourceAudits.availabilityState)}
        />
      )),
  ];

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          {joinMetadataSections(
            [
              updateStatusDetailsSection,
              frontmatterDetailsSection,
              localInfoDetailsSection,
              linkDetailsSection,
              agentAuditsDetailsSection,
            ],
            List.Item.Detail.Metadata.Separator,
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

interface InstalledSkillListItemProps {
  skill: InstalledSkill;
  isSelected: boolean;
  isShowingDetail: boolean;
  mutate: MutateSkills;
  onToggleDetail: () => void;
  onRefresh: () => void;
}

function BaseInstalledSkillListItem({
  skill,
  skillDetailPageUrl,
  audits,
  isSelected,
  isShowingDetail,
  mutate,
  onToggleDetail,
  onRefresh,
}: InstalledSkillListItemProps & { skillDetailPageUrl?: string; audits?: ReturnType<typeof useSkillAudits> }) {
  const extraAgents = skill.agentCount - skill.agents.length;
  const agentsText = extraAgents > 0 ? `${skill.agents.join(", ")} +${extraAgents} more` : skill.agents.join(", ");

  return (
    <List.Item
      title={skill.name}
      subtitle={isShowingDetail ? undefined : skill.source}
      icon={{ source: Icon.Hammer, tintColor: skill.hasUpdate ? Color.Orange : Color.Purple }}
      accessories={
        isShowingDetail
          ? []
          : [
              ...(skill.hasUpdate
                ? [
                    {
                      icon: { source: Icon.ArrowClockwise, tintColor: Color.Orange },
                      tag: { value: "Update available", color: Color.Orange },
                    },
                  ]
                : []),
              { icon: Icon.ComputerChip, text: `${skill.agentCount}`, tooltip: agentsText },
            ]
      }
      keywords={[skill.name, ...skill.agents, ...(skill.source ? [skill.source] : [])]}
      id={skill.name}
      detail={
        <InlineDetail skill={skill} isSelected={isSelected} skillDetailPageUrl={skillDetailPageUrl} audits={audits} />
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.ShowInFinder path={skill.path} icon={Icon.Finder} />
            {skillDetailPageUrl && (
              <Action.OpenInBrowser
                title="Open on skills.sh"
                url={skillDetailPageUrl}
                icon={Icon.Globe}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            )}
            {skill.sourceUrl && (
              <Action.OpenInBrowser
                title="Open Repository"
                url={skill.sourceUrl}
                icon={Icon.Globe}
                shortcut={Keyboard.Shortcut.Common.OpenWith}
              />
            )}
          </ActionPanel.Section>
          {audits && <OpenSecurityAuditActions audits={audits.results} />}
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Skill Name"
              content={skill.name}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            <Action.CopyToClipboard
              title="Copy Install Path"
              content={skill.path}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
            {skill.sourceUrl && <Action.CopyToClipboard title="Copy Source URL" content={skill.sourceUrl} />}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {skill.hasUpdate && <UpdateSkillAction skillName={skill.name} mutate={mutate} />}
            <RemoveSkillAction skill={skill} mutate={mutate} />
          </ActionPanel.Section>
          <Action
            title={isShowingDetail ? "Hide Detail Panel" : "Show Detail Panel"}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={onToggleDetail}
          />
          <Action
            title="Refresh Installed Skills"
            onAction={onRefresh}
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
}

function SourceBackedInstalledSkillListItem(
  props: InstalledSkillListItemProps & { skill: InstalledSkill & { source: string } },
) {
  const remoteSkill: Skill = {
    id: `${props.skill.source}/${props.skill.name}`,
    skillId: props.skill.name,
    name: props.skill.name,
    installs: 0,
    source: props.skill.source,
  };
  const skillDetailPageUrl = buildSkillUrl(remoteSkill);
  const audits = useSkillAudits(remoteSkill, { shouldFetch: props.isSelected });

  return <BaseInstalledSkillListItem {...props} skillDetailPageUrl={skillDetailPageUrl} audits={audits} />;
}

export function InstalledSkillListItem({ skill, ...props }: InstalledSkillListItemProps) {
  if (isGithubBackedInstalledSkill(skill)) {
    return <SourceBackedInstalledSkillListItem {...props} skill={skill} />;
  }

  return <BaseInstalledSkillListItem {...props} skill={skill} />;
}
