import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { importGitHubRepoAsSkill, importSkillFromGitHub, parseGitHubRepoUrl, parseGitHubUrl } from "./utils/github";
import { createSymlinksToCodex } from "./utils/central-skills";

export default function ImportSkillFromGitHub() {
  const { pop } = useNavigation();
  const [urlError, setUrlError] = useState<string | undefined>();

  async function handleSubmit(values: { url: string; skillName?: string; autoTag: boolean; createSymlink: boolean }) {
    const url = values.url.trim();
    const skillNameOverride = values.skillName?.trim();

    if (!url) {
      setUrlError("URL is required");
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Importing skill..." });

    try {
      let skillName: string;
      const isSkillPathImport = !!parseGitHubUrl(url);
      const isRepoImport = !!parseGitHubRepoUrl(url);

      if (isSkillPathImport) {
        skillName = await importSkillFromGitHub(url);
      } else if (isRepoImport) {
        skillName = await importGitHubRepoAsSkill(url, skillNameOverride, values.autoTag);
      } else {
        throw new Error(
          "Invalid GitHub URL format. Use owner/repo, repo URL, or a blob/tree URL pointing to SKILL.md/folder.",
        );
      }

      // Optionally create symlink to codex
      if (values.createSymlink) {
        await createSymlinksToCodex();
      }

      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Skill imported",
        message: skillName,
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
      navigationTitle="Import Skill from GitHub"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Skill" icon={Icon.Download} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="url"
        title="GitHub URL"
        placeholder="https://github.com/owner/repo or /tree/main/path"
        error={urlError}
        onChange={() => setUrlError(undefined)}
        info="Supports repo URL (owner/repo) and SKILL.md/folder URLs."
      />
      <Form.TextField
        id="skillName"
        title="Skill name (optional)"
        placeholder="Fallback: repository name"
        info="Used for repository imports. If empty, repository name is used."
      />
      <Form.Checkbox
        id="autoTag"
        label="Auto-tag imported skill"
        defaultValue={false}
        info="Disabled by default. Enable only if you explicitly want automatic tags."
      />
      <Form.Checkbox
        id="createSymlink"
        label="Create symlink to Codex skills folder"
        defaultValue={true}
        info="Link the imported skill to ~/.codex/skills so it's available to Codex agents"
      />
      <Form.Description
        title="Supported Formats"
        text={
          "• https://github.com/owner/repo\n" +
          "• owner/repo\n" +
          "• https://github.com/owner/repo/blob/main/path/SKILL.md\n" +
          "• https://github.com/owner/repo/tree/main/path/skill-folder\n" +
          "• owner/repo/path/to/skill"
        }
      />
      <Form.Description
        title="What happens"
        text={
          "The skill will be downloaded to ~/agents/skills (central folder). " +
          "If the skill already exists, the import will fail."
        }
      />
    </Form>
  );
}
