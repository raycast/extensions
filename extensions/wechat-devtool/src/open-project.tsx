import { showFailureToast } from "@raycast/utils";
import { useNavigation, showToast, Toast, showHUD } from "@raycast/api";

import { ProjectList } from "@/components";
import { openProject } from "@/utils";
import type { Project } from "@/types";

export default function OpenProject() {
  const { pop } = useNavigation();

  async function handleOpenProject(project: Project) {
    showToast({
      style: Toast.Style.Animated,
      title: "Opening project...",
    });

    try {
      await openProject(project.path);
      showHUD("✅ Project opened successfully");
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to Open Project" });
    }
  }

  return <ProjectList onProjectAction={handleOpenProject} actionTitle="Open Project" />;
}
