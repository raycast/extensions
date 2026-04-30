import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { buildInstallCommand, formatInstalls, type Skill, SKILLS_BASE_URL } from "../shared";
import { type InstalledSkillMatch } from "../hooks/useInstalledSkillMatches";
import { InstallSkillAction } from "./actions/InstallSkillAction";
import { SkillDetailView } from "./SkillDetailView";

interface SkillListItemProps {
  skill: Skill;
  rank?: number;
  installedMatch: InstalledSkillMatch;
  onViewedSkillChange: (skillId: string) => void;
  onSkillInstalled?: () => void | Promise<void>;
}

export function SkillListItem({
  skill,
  rank,
  installedMatch,
  onViewedSkillChange,
  onSkillInstalled,
}: SkillListItemProps) {
  const title = rank !== undefined && rank !== null ? `#${rank} ${skill.name}` : skill.name;
  const isInstalled = installedMatch.type === "exact";
  const hasSourceConflict = installedMatch.type === "conflict";
  const installedSource = installedMatch.type === "conflict" ? (installedMatch.source ?? "Unknown source") : undefined;

  const iconValue = isInstalled
    ? { source: Icon.CheckCircle, tintColor: Color.Green }
    : hasSourceConflict
      ? { source: Icon.Warning, tintColor: Color.Orange }
      : rank !== undefined && rank !== null
        ? { source: Icon.Trophy, tintColor: rank <= 3 ? Color.Yellow : Color.SecondaryText }
        : { source: Icon.Hammer, tintColor: Color.SecondaryText };
  const iconTooltip = isInstalled
    ? "Installed"
    : hasSourceConflict
      ? `Installed from source "${installedSource}"`
      : undefined;
  const icon = iconTooltip ? { value: iconValue, tooltip: iconTooltip } : iconValue;

  const accessories: List.Item.Accessory[] = [{ text: formatInstalls(skill.installs), icon: Icon.Download }];

  return (
    <List.Item
      title={title}
      subtitle={skill.source}
      keywords={[skill.name, skill.source, skill.id]}
      icon={icon}
      accessories={accessories}
      id={skill.id}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Sidebar}
            target={<SkillDetailView skill={skill} onSkillInstalled={onSkillInstalled} />}
            onPush={() => onViewedSkillChange(skill.id)}
          />
          <InstallSkillAction skill={skill} installedMatch={installedMatch} onSkillInstalled={onSkillInstalled} />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content={buildInstallCommand(skill)}
            icon={Icon.Terminal}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.OpenInBrowser
            title="Open Repository"
            url={`https://github.com/${skill.source}`}
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.OpenWith}
          />
          <Action.OpenInBrowser
            title="Open Skills"
            url={`${SKILLS_BASE_URL}/${skill.source}/${skill.skillId}`}
            icon={Icon.Link}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
        </ActionPanel>
      }
    />
  );
}
