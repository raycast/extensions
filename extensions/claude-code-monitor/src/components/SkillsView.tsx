import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  Detail,
  showToast,
  Toast,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { uninstallSkill } from "../lib/skills";
import type { SkillInfo } from "../types";

export function SkillsView({
  skills,
  isLoading,
  revalidate,
}: {
  skills: SkillInfo[];
  isLoading: boolean;
  revalidate: () => void;
}) {
  const userSkills = skills.filter((s) => s.source === "user");
  const commandSkills = skills.filter((s) => s.source === "command");
  const pluginSkills = skills.filter((s) => s.source === "plugin");

  const isEmpty = skills.length === 0;

  return (
    <>
      {isEmpty && !isLoading && (
        <List.EmptyView
          title="No Skills Installed"
          description="Install skills using npx skills add <package>."
          icon={Icon.Book}
        />
      )}
      {userSkills.length > 0 && (
        <List.Section title="User Skills" subtitle={`${userSkills.length}`}>
          {userSkills.map((s) => (
            <SkillListItem
              key={`user-${s.dirName}`}
              skill={s}
              revalidate={revalidate}
            />
          ))}
        </List.Section>
      )}
      {commandSkills.length > 0 && (
        <List.Section title="Commands" subtitle={`${commandSkills.length}`}>
          {commandSkills.map((s) => (
            <SkillListItem
              key={`cmd-${s.dirName}`}
              skill={s}
              revalidate={revalidate}
            />
          ))}
        </List.Section>
      )}
      {pluginSkills.length > 0 && (
        <List.Section title="Plugin Skills" subtitle={`${pluginSkills.length}`}>
          {pluginSkills.map((s) => (
            <SkillListItem
              key={`plugin-${s.dirName}`}
              skill={s}
              revalidate={revalidate}
            />
          ))}
        </List.Section>
      )}
    </>
  );
}

function SkillListItem({
  skill,
  revalidate,
}: {
  skill: SkillInfo;
  revalidate: () => void;
}) {
  const accessories: List.Item.Accessory[] = [];

  if (skill.userInvokable) {
    accessories.push({
      tag: { value: `/${skill.name}`, color: Color.Green },
    });
  }

  if (skill.pluginName) {
    accessories.push({
      tag: { value: skill.pluginName, color: Color.Blue },
    });
  } else if (skill.source === "user") {
    accessories.push({
      tag: {
        value: skill.isSymlink ? "Symlink" : "Local",
        color: skill.isSymlink ? Color.Blue : Color.Purple,
      },
    });
  }

  return (
    <List.Item
      title={skill.name}
      subtitle={skill.description}
      icon={{ source: Icon.Book, tintColor: Color.Blue }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Skill">
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<SkillDetailView skill={skill} revalidate={revalidate} />}
            />
            <Action.ShowInFinder
              title="Show in Finder"
              path={skill.path}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Skill Name"
              content={skill.name}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Skill Path"
              content={skill.path}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Uninstall Skill"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() => handleUninstallSkill(skill, revalidate)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SkillDetailView({
  skill,
  revalidate,
}: {
  skill: SkillInfo;
  revalidate: () => void;
}) {
  let markdown = `# ${skill.name}\n\n`;
  if (skill.description) markdown += `${skill.description}\n\n`;
  if (skill.userInvokable)
    markdown += `Use with \`/${skill.name}\` in Claude Code.\n\n`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Name" text={skill.name} />
          <Detail.Metadata.Label title="Directory" text={skill.dirName} />
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item
              text={skill.isSymlink ? "Symlink" : "Local"}
              color={skill.isSymlink ? Color.Blue : Color.Purple}
            />
            {skill.userInvokable && (
              <Detail.Metadata.TagList.Item
                text="Invokable"
                color={Color.Green}
              />
            )}
          </Detail.Metadata.TagList>
          {skill.symlinkTarget && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Symlink Target"
                text={skill.symlinkTarget}
              />
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Path" text={skill.path} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.ShowInFinder
            title="Show in Finder"
            path={skill.path}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action.CopyToClipboard
            title="Copy Skill Name"
            content={skill.name}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Uninstall Skill"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => handleUninstallSkill(skill, revalidate)}
          />
        </ActionPanel>
      }
    />
  );
}

async function handleUninstallSkill(skill: SkillInfo, revalidate: () => void) {
  const confirmed = await confirmAlert({
    title: "Uninstall Skill",
    message: `Remove "${skill.name}" from Claude Code?${skill.isSymlink ? " (This will only remove the symlink)" : ""}`,
    primaryAction: {
      title: "Uninstall",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;

  try {
    uninstallSkill(skill.dirName);
    revalidate();
    await showToast({
      style: Toast.Style.Success,
      title: `Uninstalled ${skill.name}`,
    });
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to uninstall skill",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
