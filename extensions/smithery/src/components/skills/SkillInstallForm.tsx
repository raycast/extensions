import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import { buildSkillInstallArgs } from "../../constants/commands";
import { SKILL_AGENTS } from "../../constants/skill-agents";
import { runSmitheryMutation } from "../../utils/smithery";
import {
  showFailureToast,
  showRunningToast,
  showSuccessToast,
} from "../../utils/toast";

type SkillInstallFormProps = {
  namespace: string;
  slug: string;
  displayName: string;
};

export function SkillInstallForm({
  namespace,
  slug,
  displayName,
}: SkillInstallFormProps) {
  const [agent, setAgent] = useState<string>(
    SKILL_AGENTS[0]?.value ?? "claude-code",
  );
  const [globalInstall, setGlobalInstall] = useState(false);

  async function handleInstall() {
    const toast = await showRunningToast(
      `Installing ${displayName}`,
      `Adding to ${agent}...`,
    );

    try {
      const args = buildSkillInstallArgs(`${namespace}/${slug}`, agent);

      if (globalInstall) {
        args.push("--global");
      }

      await runSmitheryMutation(args);
      showSuccessToast(toast, `Installed ${displayName}`, `Added to ${agent}.`);
    } catch (installError) {
      showFailureToast(
        toast,
        "Installation failed",
        installError,
        "Could not install skill.",
      );
    }
  }

  return (
    <Form
      navigationTitle={`Add ${displayName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Install Skill" onSubmit={handleInstall} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="agent" title="Agent" value={agent} onChange={setAgent}>
        {SKILL_AGENTS.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value}
            title={option.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        id="global"
        title="Global Install"
        label="Install globally (user-level)"
        value={globalInstall}
        onChange={setGlobalInstall}
      />
    </Form>
  );
}
