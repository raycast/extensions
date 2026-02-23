import { ActionPanel, Action, Icon, Keyboard, List, Color } from "@raycast/api";
import type { InstalledSkill } from "../shared";
import { InstalledSkillDetail } from "./InstalledSkillDetail";
import { RemoveSkillAction } from "./actions/RemoveSkillAction";

interface InstalledSkillListItemProps {
  skill: InstalledSkill;
  onUpdate: () => void;
}

export function InstalledSkillListItem({ skill, onUpdate }: InstalledSkillListItemProps) {
  const extraAgents = skill.agentCount - skill.agents.length;
  const agentsText = extraAgents > 0 ? `${skill.agents.join(", ")} +${extraAgents} more` : skill.agents.join(", ");

  return (
    <List.Item
      title={skill.name}
      subtitle={agentsText}
      icon={{ source: Icon.Hammer, tintColor: Color.Purple }}
      accessories={[{ icon: Icon.ComputerChip, text: `${skill.agentCount}`, tooltip: agentsText }]}
      keywords={[skill.name, ...skill.agents]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={<InstalledSkillDetail skill={skill} onRemove={onUpdate} />}
          />
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
        </ActionPanel>
      }
    />
  );
}
