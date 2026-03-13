import { Action, Icon, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import type { InstalledSkill } from "../../shared";
import { removeSkill } from "../../utils/skills-cli";

interface RemoveSkillActionProps {
  skill: InstalledSkill;
  onRemove: () => void;
}

export function RemoveSkillAction({ skill, onRemove }: RemoveSkillActionProps) {
  return (
    <Action
      title="Remove Skill"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: `Remove "${skill.name}"?`,
          message: "This will remove the skill from all agents.",
          primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;

        const toast = await showToast({ style: Toast.Style.Animated, title: "Removing skill..." });
        try {
          await removeSkill(skill.name);
          toast.style = Toast.Style.Success;
          toast.title = "Skill removed";
          onRemove();
        } catch (error) {
          await toast.hide();
          await showFailureToast(error, { title: "Failed to remove skill" });
        }
      }}
    />
  );
}
