import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  launchCommand,
  showToast,
  showInFinder,
  LaunchType,
} from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { useEffect, useState } from "react";
import type { Skill } from "@/types";
import { expandTilde, ensureDirExists, pathExists } from "@/lib/paths";
import { deleteSkill, listSkills } from "@/lib/skills";
import SkillForm from "@/commands/skills/form";
import SkillFiles from "@/commands/skills/files";
import SkillEntryForm from "@/commands/skills/entry-form";
import SkillImportForm from "@/commands/skills/import-form";

const SKILL_FILE = "SKILL.md";

export default function SkillsCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const skillsDir = expandTilde(preferences.skillsDir);

  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dirMissing, setDirMissing] = useState(false);

  async function loadSkills() {
    setIsLoading(true);
    try {
      const exists = await pathExists(skillsDir);
      if (!exists) {
        setDirMissing(true);
        setSkills([]);
        return;
      }
      setDirMissing(false);
      const list = await listSkills(skillsDir);
      setSkills(list);
    } catch {
      setSkills([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSkills();
  }, [skillsDir]);

  async function handleCreateDir() {
    try {
      await ensureDirExists(skillsDir);
      await showToast({
        style: Toast.Style.Success,
        title: "Skills folder created",
      });
      await loadSkills();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create folder",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleDelete(skill: Skill) {
    const confirmed = await confirmAlert({
      title: `Delete ${skill.name}?`,
      message: "This will remove the skill folder.",
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteSkill(skill.path);
      await showToast({ style: Toast.Style.Success, title: "Skill deleted" });
      await loadSkills();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleCopySkill(skill: Skill) {
    const skillFile = path.join(skill.path, SKILL_FILE);
    try {
      const content = await fs.readFile(skillFile, "utf8");
      await Clipboard.copy(content);
      await showToast({ style: Toast.Style.Success, title: "SKILL.md copied" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to copy SKILL.md",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search skills">
      {dirMissing ? (
        <List.EmptyView
          title="Skills folder not found"
          description="Create the skills folder to start managing skills."
          actions={
            <ActionPanel>
              <Action title="Create Skills Folder" onAction={handleCreateDir} />
              <Action
                title="Open Doctor"
                onAction={() =>
                  launchCommand({
                    name: "doctor",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      ) : skills.length === 0 ? (
        <List.EmptyView
          title="No skills yet"
          description="Create your first skill to get started."
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Skill"
                icon={Icon.Plus}
                target={<SkillForm mode="create" skillsDir={skillsDir} existingNames={[]} onSaved={loadSkills} />}
              />
              <Action.Push
                title="Import Skill from Zip"
                icon={Icon.ArrowDownCircle}
                target={<SkillImportForm skillsDir={skillsDir} onImported={loadSkills} />}
              />
              <Action
                title="Open Doctor"
                icon={Icon.Heartbeat}
                onAction={() =>
                  launchCommand({
                    name: "doctor",
                    type: LaunchType.UserInitiated,
                  })
                }
              />
            </ActionPanel>
          }
        />
      ) : (
        skills.map((skill) => (
          <List.Item
            key={skill.name}
            title={skill.name}
            subtitle={skill.description}
            accessories={[
              { icon: skill.hasSkillFile ? Icon.Checkmark : Icon.XmarkCircle },
              ...(skill.hasSkillFile ? [] : [{ tag: "Missing SKILL.md" }]),
              ...(typeof skill.fileCount === "number" ? [{ tag: `Files: ${skill.fileCount}` }] : []),
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Browse Files"
                  icon={Icon.Folder}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                  target={<SkillFiles skill={skill} />}
                />
                <Action.Push
                  title="Create Skill"
                  icon={Icon.Plus}
                  target={
                    <SkillForm
                      mode="create"
                      skillsDir={skillsDir}
                      existingNames={skills.map((item) => item.name)}
                      onSaved={loadSkills}
                    />
                  }
                />
                <Action.Push
                  title="Import Skill from Zip"
                  icon={Icon.ArrowDownCircle}
                  target={<SkillImportForm skillsDir={skillsDir} onImported={loadSkills} />}
                />
                <Action.Push
                  title="Add File or Folder"
                  icon={Icon.PlusCircle}
                  target={<SkillEntryForm skillPath={skill.path} onSaved={loadSkills} />}
                />
                <Action.Push
                  title="Edit Metadata"
                  icon={Icon.Pencil}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={
                    <SkillForm
                      mode="edit"
                      skill={skill}
                      skillsDir={skillsDir}
                      existingNames={skills.filter((item) => item.name !== skill.name).map((item) => item.name)}
                      onSaved={loadSkills}
                    />
                  }
                />
                <Action
                  title="Copy Skill.md"
                  icon={Icon.CopyClipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={() => handleCopySkill(skill)}
                />
                <Action title="Reveal in Finder" icon={Icon.Finder} onAction={() => showInFinder(skill.path)} />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(skill)}
                />
                <Action
                  title="Open Doctor"
                  icon={Icon.Heartbeat}
                  onAction={() =>
                    launchCommand({
                      name: "doctor",
                      type: LaunchType.UserInitiated,
                    })
                  }
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
