import { Action, Icon, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { updateAllSkills } from "../../utils/skills-cli";

interface UpdateSkillActionProps {
  onUpdate: () => void;
}

export function UpdateSkillAction({ onUpdate }: UpdateSkillActionProps) {
  return (
    <Action
      title="Update All Skills"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: "Update All Skills?",
          message: "This will update all installed skills to the latest version.",
          primaryAction: { title: "Update", style: Alert.ActionStyle.Default },
        });
        if (!confirmed) return;

        const toast = await showToast({ style: Toast.Style.Animated, title: "Updating skills..." });
        try {
          await updateAllSkills();
          toast.style = Toast.Style.Success;
          toast.title = "All skills updated";
          onUpdate();
        } catch (error) {
          await toast.hide();
          await showFailureToast(error, { title: "Failed to update skills" });
        }
      }}
    />
  );
}
