import { Action, Icon, confirmAlert, Alert, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { updateAllSkills, updateSkill } from "../../utils/skills-cli";
import type { MutateSkills } from "../../hooks/useInstalledSkills";

interface UpdateSkillActionProps {
  /** When provided, updates just this skill. Otherwise, updates all installed skills. */
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
      onAction={async () => {
        const confirmed = await confirmAlert({
          title: isSingle ? `Update "${skillName}"?` : "Update All Skills?",
          message: isSingle
            ? `This will update "${skillName}" to the latest version.`
            : "This will update all installed skills to the latest version.",
          primaryAction: { title: "Update", style: Alert.ActionStyle.Default },
        });
        if (!confirmed) return;

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: isSingle ? "Updating skill..." : "Updating skills...",
        });
        try {
          await mutate(isSingle ? updateSkill(skillName) : updateAllSkills(), {
            optimisticUpdate: (skills) => {
              if (!skills) return [];
              return skills.map((s) => (!isSingle || s.name === skillName ? { ...s, hasUpdate: false } : s));
            },
          });
          toast.style = Toast.Style.Success;
          toast.title = isSingle ? "Skill updated" : "All skills updated";
        } catch (error) {
          await toast.hide();
          await showFailureToast(error, {
            title: isSingle ? "Failed to update skill" : "Failed to update skills",
          });
        }
      }}
    />
  );
}
