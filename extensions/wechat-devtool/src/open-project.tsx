import React from "react";
import { useNavigation, showToast, Toast, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openProject } from "./utils/cli";
import { Project, DeviceConfig } from "./types";
import ProjectList from "./components/project-list";

export default function OpenProject() {
  const { pop } = useNavigation();

  async function handleOpenProject(project: Project, deviceConfig: DeviceConfig | undefined) {
    if (!deviceConfig) {
      await showFailureToast(new Error("Device configuration not found"), { title: "Configuration Missing" });
      return;
    }

    showToast({
      style: Toast.Style.Animated,
      title: "Opening project...",
    });

    try {
      await openProject(deviceConfig.cliPath, project.path);
      showHUD("Project opened successfully");
      pop();
    } catch (error) {
      showFailureToast(error, { title: "Failed to Open Project" });
    }
  }

  return <ProjectList onProjectAction={handleOpenProject} actionTitle="Open Project" />;
}
