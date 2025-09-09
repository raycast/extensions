import { showFailureToast } from "@raycast/utils";
import { useNavigation, showToast, Toast, showHUD } from "@raycast/api";

import ProjectList from "./components/project-list";
import { openProject } from "./utils/command";
import { ExtensionConfig, Project } from "./types";

export default function OpenProject() {
  const { pop } = useNavigation();

  async function handleOpenProject(project: Project, config: ExtensionConfig) {
    showToast({
      style: Toast.Style.Animated,
      title: "Opening project...",
    });

    try {
      await openProject(config.cliPath, project.path);
      showHUD("✅ Project opened successfully");
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to Open Project" });
    }
  }

  return <ProjectList onProjectAction={handleOpenProject} actionTitle="Open Project" />;
}
