import { Action, Alert, Icon } from "@raycast/api";
import { updateAllSkills, updateSkill } from "../../utils/skills-cli";
import { withSkillAction } from "../../utils/with-skill-action";
import type { MutateSkills } from "../../hooks/useInstalledSkills";

interface UpdateSkillActionProps {
  skillName?: string;
  mutate: MutateSkills;
}

export function UpdateSkillAction({ skillName, mutate }: UpdateSkillActionProps) {
  const isSingle = skillName !== undefined;

  return (
    <Action
      title={isSingle ? "Update Skill" : "Update All Skills"}
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
      onAction={() =>
        withSkillAction({
          confirm: {
            title: isSingle ? `Update "${skillName}"?` : "Update All Skills?",
            message: isSingle
              ? `This will update "${skillName}" to the latest version.`
              : "This will update all installed skills to the latest version.",
            primaryAction: { title: "Update", style: Alert.ActionStyle.Default },
          },
          toast: {
            animatedTitle: isSingle ? "Updating skill..." : "Updating skills...",
            successTitle: isSingle ? "Skill updated" : "All skills updated",
            failureTitle: isSingle ? "Failed to update skill" : "Failed to update skills",
          },
          operation: () =>
            mutate(isSingle ? updateSkill(skillName) : updateAllSkills(), {
              optimisticUpdate: (skills) => {
                if (!skills) return [];
                return skills.map((s) => (!isSingle || s.name === skillName ? { ...s, hasUpdate: false } : s));
              },
            }),
        })
      }
    />
  );
}
