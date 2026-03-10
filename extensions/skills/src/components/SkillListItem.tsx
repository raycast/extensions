import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { Skill, SkillFrontmatter, buildInstallCommand, formatInstalls, normalizeAllowedTools } from "../shared";
import { useSkillContent } from "../hooks/useSkillContent";
import { useRepoStats, RepoStats } from "../hooks/useRepoStats";
import { InstallSkillAction } from "./actions/InstallSkillAction";

function InlineDetail({
  skill,
  content,
  frontmatter,
  isLoading,
  stats,
}: {
  skill: Skill;
  content: string | undefined;
  frontmatter: SkillFrontmatter;
  isLoading: boolean;
  stats: RepoStats | undefined;
}) {
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
            stats?.stars != null && (
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
            target={`https://skills.sh/${skill.source}/${skill.skillId}`}
          />
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
  const title = rank != null ? `#${rank} ${skill.name}` : skill.name;
  const { content, frontmatter, isLoading } = useSkillContent(skill, isSelected);
  const { stats } = useRepoStats(skill, isSelected);

  const icon =
    rank != null
      ? { source: Icon.Trophy, tintColor: rank <= 3 ? Color.Yellow : Color.SecondaryText }
      : { source: Icon.Hammer };

  return (
    <List.Item
      title={title}
      subtitle={isShowingDetail ? undefined : (frontmatter.description ?? skill.source)}
      keywords={[skill.name, skill.source, skill.id]}
      icon={icon}
      accessories={isShowingDetail ? [] : [{ text: formatInstalls(skill.installs), icon: Icon.Download }]}
      id={skill.id}
      detail={
        <InlineDetail skill={skill} content={content} frontmatter={frontmatter} isLoading={isLoading} stats={stats} />
      }
      actions={
        <ActionPanel>
          <InstallSkillAction skill={skill} />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={buildInstallCommand(skill)}
            icon={Icon.Terminal}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.OpenInBrowser title="Open Repository" url={`https://github.com/${skill.source}`} icon={Icon.Globe} />
          <Action.OpenInBrowser
            title="Open Skills"
            url={`https://skills.sh/${skill.source}/${skill.skillId}`}
            icon={Icon.Link}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
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
