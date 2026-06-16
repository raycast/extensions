import { Alert, Color, Icon } from "@raycast/api";
import { updateAllSkills } from "./utils/skills-cli";
import { withSkillAction } from "./utils/with-skill-action";

export default async function Command() {
  await withSkillAction({
    confirm: {
      icon: { source: Icon.ArrowClockwise, tintColor: Color.Orange },
      title: "Update All Skills?",
      message: "This will update all installed skills to the latest version.",
      primaryAction: { title: "Update", style: Alert.ActionStyle.Default },
    },
    toast: {
      animatedTitle: "Updating skills...",
      successTitle: "All skills updated",
      failureTitle: "Failed to update skills",
    },
    operation: updateAllSkills,
  });
}
