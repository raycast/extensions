import { ActionPanel, Action, Icon, Keyboard, List, Color } from "@raycast/api";
import { readFile } from "fs/promises";
import { join } from "path";
import { useCachedPromise } from "@raycast/utils";
import { type InstalledSkill, removeFrontmatter } from "../shared";
import { RemoveSkillAction } from "./actions/RemoveSkillAction";

function InlineDetail({ skill, isSelected }: { skill: InstalledSkill; isSelected: boolean }) {
  const { data: content, isLoading } = useCachedPromise(
    async (path: string) => {
      const raw = await readFile(join(path, "SKILL.md"), "utf-8");
      return removeFrontmatter(raw);
    },
    [skill.path],
    { execute: isSelected },
  );

  const markdown = isLoading ? `# ${skill.name}\n\nLoading...` : (content ?? `# ${skill.name}\n\nNo SKILL.md found.`);

  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={skill.name} />
          <List.Item.Detail.Metadata.TagList title="Agents">
            {skill.agents.map((agent) => (
              <List.Item.Detail.Metadata.TagList.Item key={agent} text={agent} color={Color.Blue} />
            ))}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Path" text={skill.path} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

interface InstalledSkillListItemProps {
  skill: InstalledSkill;
  isSelected: boolean;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onUpdate: () => void;
}

export function InstalledSkillListItem({
  skill,
  isSelected,
  isShowingDetail,
  onToggleDetail,
  onUpdate,
}: InstalledSkillListItemProps) {
  const extraAgents = skill.agentCount - skill.agents.length;
  const agentsText = extraAgents > 0 ? `${skill.agents.join(", ")} +${extraAgents} more` : skill.agents.join(", ");

  return (
    <List.Item
      title={skill.name}
      subtitle={isShowingDetail ? undefined : agentsText}
      icon={{ source: Icon.Hammer, tintColor: Color.Purple }}
      accessories={
        isShowingDetail ? [] : [{ icon: Icon.ComputerChip, text: `${skill.agentCount}`, tooltip: agentsText }]
      }
      keywords={[skill.name, ...skill.agents]}
      id={skill.name}
      detail={<InlineDetail skill={skill} isSelected={isSelected} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Open">
            <Action.ShowInFinder path={skill.path} icon={Icon.Finder} />
          </ActionPanel.Section>
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
          </ActionPanel.Section>
          <ActionPanel.Section>
            <RemoveSkillAction skill={skill} onRemove={onUpdate} />
          </ActionPanel.Section>
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
