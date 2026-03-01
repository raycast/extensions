import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { listSkillFolders, getCentralSkillsPath, getCodexSkillsPath } from "./utils/central-skills";

export default function ManageAgents() {
  const {
    data: centralSkills,
    isLoading: centralLoading,
    revalidate,
  } = usePromise(async () => {
    const path = getCentralSkillsPath();
    return { path, skills: await listSkillFolders(path) };
  });

  const { data: codexSkills, isLoading: codexLoading } = usePromise(async () => {
    const path = getCodexSkillsPath();
    return { path, skills: await listSkillFolders(path) };
  });

  const isLoading = centralLoading || codexLoading;

  return (
    <List isLoading={isLoading} navigationTitle="Manage Agents">
      <List.Section title="Central Skills Folder" subtitle={centralSkills?.path}>
        {centralSkills && centralSkills.skills.length === 0 && (
          <List.Item
            title="No skills found"
            icon={Icon.ExclamationMark}
            subtitle="Import or sync skills to get started"
          />
        )}
        {centralSkills?.skills.map((skill) => (
          <List.Item
            key={skill.name}
            title={skill.name}
            icon={skill.hasSkillMd ? Icon.CheckCircle : Icon.Circle}
            subtitle={skill.description}
            accessories={[
              {
                tag: {
                  value: skill.hasSkillMd ? "Valid" : "No SKILL.md",
                  color: skill.hasSkillMd ? Color.Green : Color.Orange,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.ShowInFinder path={skill.path} />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={skill.path}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Codex Skills Folder" subtitle={codexSkills?.path}>
        {codexSkills && codexSkills.skills.length === 0 && (
          <List.Item title="No skills found" icon={Icon.ExclamationMark} subtitle="Run sync to create symlinks" />
        )}
        {codexSkills?.skills.map((skill) => (
          <List.Item
            key={skill.name}
            title={skill.name}
            icon={skill.hasSkillMd ? Icon.CheckCircle : Icon.Circle}
            subtitle={skill.description}
            accessories={[
              {
                tag: {
                  value: skill.hasSkillMd ? "Valid" : "No SKILL.md",
                  color: skill.hasSkillMd ? Color.Green : Color.Orange,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.ShowInFinder path={skill.path} />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={skill.path}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Summary">
        <List.Item
          title="Central Skills"
          icon={Icon.Folder}
          accessories={[{ text: String(centralSkills?.skills.length ?? 0) }]}
        />
        <List.Item
          title="Codex Skills"
          icon={Icon.Link}
          accessories={[{ text: String(codexSkills?.skills.length ?? 0) }]}
        />
      </List.Section>
    </List>
  );
}
