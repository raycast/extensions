import { updateAllSkills } from "./utils/skills-cli";
import { withSkillAction } from "./utils/with-skill-action";

export default async function Command() {
  await withSkillAction({
    toast: {
      animatedTitle: "Updating skills...",
      successTitle: "All skills updated",
      failureTitle: "Failed to update skills",
    },
    operation: updateAllSkills,
  });
}
