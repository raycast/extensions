import { showToast, Toast, useNavigation } from "@raycast/api";
import { launchTask } from "./task-manager";
import { TaskDetail } from "./task-detail";
import { RepoPicker } from "./repo-picker";
import { SkillGate, type SkillConfig } from "./skill-picker";

export default function GitPush() {
  return (
    <SkillGate command="git-push">
      {(skill) => <GitPushInner skill={skill} />}
    </SkillGate>
  );
}

function GitPushInner({ skill }: { skill: SkillConfig }) {
  const { push } = useNavigation();

  async function handleSelect(fullPath: string) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Starting git push...",
    });
    try {
      const task = await launchTask("git-push", fullPath, "git push", {
        skillName: skill.skillName,
        skillDir: skill.skillDir,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Git push task started";
      push(<TaskDetail task={task} />);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to start git push";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return <RepoPicker primaryActionTitle="Git Push" onSelect={handleSelect} />;
}
