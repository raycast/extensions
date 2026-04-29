import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import {
  getFolders,
  addFolder,
  removeFolder,
  getSkillPath,
  setSkillPath,
  removeSkillPath,
  type SkillCommand,
} from "./storage";
import { pickSkillFile } from "./skill-picker";
import { pickFolderDialog } from "./git-utils";

const SKILL_COMMANDS: { command: SkillCommand; label: string }[] = [
  { command: "git-push", label: "Git Push" },
  { command: "create-pr", label: "Create PR" },
  { command: "review-pr", label: "Review PR" },
];

export default function ManageFolders() {
  const [folders, setFolders] = useState<string[]>([]);
  const [skills, setSkills] = useState<Record<SkillCommand, string | null>>({
    "git-push": null,
    "create-pr": null,
    "review-pr": null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [f, gp, cp, rp] = await Promise.all([
      getFolders(),
      getSkillPath("git-push"),
      getSkillPath("create-pr"),
      getSkillPath("review-pr"),
    ]);
    setFolders(f);
    setSkills({ "git-push": gp, "create-pr": cp, "review-pr": rp });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAddFolder() {
    const selected = await pickFolderDialog();
    if (selected) {
      await addFolder(selected);
      await refresh();
      await showToast({
        style: Toast.Style.Success,
        title: "Added",
        message: selected,
      });
    }
  }

  return (
    <List isLoading={isLoading}>
      <List.Section title="Configured Folders">
        {folders.map((f) => (
          <List.Item
            key={f}
            icon={Icon.Folder}
            title={f}
            actions={
              <ActionPanel>
                <Action
                  title="Remove"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    await removeFolder(f);
                    await refresh();
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Removed",
                    });
                  }}
                />
                <Action
                  title="Add Folder"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={handleAddFolder}
                />
              </ActionPanel>
            }
          />
        ))}
        {folders.length === 0 && (
          <List.Item
            icon={Icon.Plus}
            title="Add Folder"
            subtitle="Press Enter to select a folder"
            actions={
              <ActionPanel>
                <Action
                  title="Add Folder"
                  icon={Icon.Plus}
                  onAction={handleAddFolder}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Skills">
        {SKILL_COMMANDS.map(({ command, label }) => {
          const path = skills[command];
          return (
            <List.Item
              key={command}
              icon={path ? Icon.Document : Icon.QuestionMarkCircle}
              title={label}
              accessories={[{ text: path || "Not configured" }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Skill File"
                    icon={Icon.Document}
                    onAction={async () => {
                      const selected = await pickSkillFile(label);
                      if (selected) {
                        await setSkillPath(command, selected);
                        await refresh();
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Skill configured",
                        });
                      }
                    }}
                  />
                  {path && (
                    <Action
                      title="Remove Skill"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={async () => {
                        await removeSkillPath(command);
                        await refresh();
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Skill removed",
                        });
                      }}
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
