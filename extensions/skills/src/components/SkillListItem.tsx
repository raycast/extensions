import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { Skill, buildInstallCommand, formatInstalls } from "../shared";
import { SkillDetail } from "./SkillDetail";
import { InstallSkillAction } from "./actions/InstallSkillAction";

export function SkillListItem({ skill, rank }: { skill: Skill; rank?: number }) {
  const title = rank != null ? `#${rank} ${skill.name}` : skill.name;

  const icon =
    rank != null
      ? { source: Icon.Trophy, tintColor: rank <= 3 ? Color.Yellow : Color.SecondaryText }
      : { source: Icon.Hammer };

  return (
    <List.Item
      title={title}
      subtitle={skill.source}
      keywords={[skill.name, skill.source, skill.id]}
      icon={icon}
      accessories={[{ text: formatInstalls(skill.installs), icon: Icon.Download }]}
      actions={
        <ActionPanel>
          <Action.Push title="View Details" icon={Icon.Eye} target={<SkillDetail skill={skill} />} />
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
        </ActionPanel>
      }
    />
  );
}
