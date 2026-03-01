import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { createSymlinksToCodex, getCentralSkillsPath } from "./utils/central-skills";
import { importGitHubRepoAsSkill } from "./utils/github";

export default function ImportRepoAsSkill() {
  const { pop } = useNavigation();
  const [repoError, setRepoError] = useState<string | undefined>();

  async function handleSubmit(values: { repo: string; skillName?: string; autoTag: boolean; createSymlink: boolean }) {
    const repo = values.repo.trim();
    const preferredName = values.skillName?.trim();

    if (!repo) {
      setRepoError("Repository is required");
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Importing repository..." });

    try {
      const skillName = await importGitHubRepoAsSkill(repo, preferredName, values.autoTag);

      if (values.createSymlink) {
        await createSymlinksToCodex();
      }

      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Repository imported",
        message: `${skillName} added to ${getCentralSkillsPath()}`,
      });
      pop();
    } catch (err) {
      await toast.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: "Import failed",
        message: String(err),
      });
    }
  }

  return (
    <Form
      navigationTitle="Import Repo as Skill"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Repository" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="repo"
        title="Repository"
        placeholder="https://github.com/owner/repo or owner/repo"
        error={repoError}
        onChange={() => setRepoError(undefined)}
        info="Uses opensrc to generate a local skill snapshot from the repository."
      />
      <Form.TextField
        id="skillName"
        title="Skill name (optional)"
        placeholder="Fallback: repository name"
        info="Used as skill title. Folder name is generated from this value."
      />
      <Form.Checkbox
        id="autoTag"
        label="Auto-tag imported skill"
        defaultValue={false}
        info="Disabled by default. Enable only when you want automatic tags added."
      />
      <Form.Checkbox
        id="createSymlink"
        label="Create symlink to Codex skills folder"
        defaultValue={true}
        info="Keep Codex synced with this repo-derived skill."
      />
      <Form.Description
        title="How it works"
        text={
          "The repository is downloaded with opensrc and imported into your central skills folder (`~/agents/skills`) with a generated SKILL.md."
        }
      />
    </Form>
  );
}
