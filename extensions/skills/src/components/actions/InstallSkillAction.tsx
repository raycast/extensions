import { Action, Icon, showToast, Toast, confirmAlert } from "@raycast/api";
import type { Skill } from "../../shared";
import { installSkill } from "../../utils/skills-cli";

interface InstallSkillActionProps {
  skill: Skill;
}

export function InstallSkillAction({ skill }: InstallSkillActionProps) {
  const handleInstall = async () => {
    const confirmed = await confirmAlert({
      title: `Install "${skill.name}"?`,
      message: `This will install the skill for all supported agents.\n\nSource: ${skill.source}`,
      primaryAction: {
        title: "Install",
      },
    });

    if (!confirmed) return;

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing skill...",
      message: skill.name,
    });

    try {
      await installSkill(skill);

      toast.style = Toast.Style.Success;
      toast.title = "Skill installed successfully";
      toast.message = `${skill.name} is now available`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to install skill";
      toast.message = error instanceof Error ? error.message : "Unknown error occurred";
    }
  };

  return <Action title="Install Skill" icon={Icon.Download} onAction={handleInstall} />;
}
