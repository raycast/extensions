import { Action, Icon, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { updateSkill, updateAllSkills } from "../../utils/skills-cli";

interface UpdateSkillActionProps {
  skillName?: string;
  onUpdate: () => void;
}

export function UpdateSkillAction({ skillName, onUpdate }: UpdateSkillActionProps) {
  return (
    <Action
      title={skillName ? `Update ${skillName}` : "Update All Skills"}
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: skillName ? `Update ${skillName}?` : "Update All Skills?",
          message: skillName
            ? `This will update "${skillName}" to the latest version.`
            : "This will update all installed skills to the latest version.",
          primaryAction: { title: "Update", style: Alert.ActionStyle.Default },
        });
        if (!confirmed) return;

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: skillName ? `Updating ${skillName}...` : "Updating skills...",
        });
        try {
          await (skillName ? updateSkill(skillName) : updateAllSkills());
          toast.style = Toast.Style.Success;
          toast.title = skillName ? `${skillName} updated` : "All skills updated";
          onUpdate();
        } catch (error) {
          await toast.hide();
          await showFailureToast(error, {
            title: skillName ? `Failed to update ${skillName}` : "Failed to update skills",
          });
        }
      }}
    />
  );
}
