import React from "react";
import { showToast, Toast, useNavigation, closeMainWindow } from "@raycast/api";
import { openProject } from "./utils/cli";
import { Project, DeviceConfig } from "./types";
import ProjectList from "./components/project-list";

export default function OpenProject() {
  const { pop } = useNavigation();

  async function handleOpenProject(project: Project, deviceConfig: DeviceConfig | undefined) {
    if (!deviceConfig) {
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Failed",
        message: "Device configuration not found",
      });
      return;
    }

    const result = await openProject(deviceConfig.cliPath, project.path);

    if (result.success) {
      await showToast({
        style: Toast.Style.Success,
        title: "✅ Success",
        message: `Opened project: ${project.name}`,
      });
      await closeMainWindow();
      pop();
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Failed",
        message: result.error || "Failed to open project",
      });
    }
  }

  return <ProjectList onProjectAction={handleOpenProject} actionTitle="Open Project" />;
}
