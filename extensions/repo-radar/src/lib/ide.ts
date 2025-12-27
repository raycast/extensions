import { showToast, Toast, showHUD, open } from "@raycast/api";
import { Project, OpenMode } from "../types";
import { updateLastOpened } from "./storage";

// ============================================
// Project Open Operations
// ============================================

export async function openProjectInApp(project: Project): Promise<boolean> {
  const openMode: OpenMode = project.openMode ?? "ide";

  try {
    // Open in IDE
    if (openMode === "ide" || openMode === "both") {
      for (const path of project.paths) {
        await open(path, project.app.bundleId);
      }
    }

    // Open in Terminal
    if ((openMode === "terminal" || openMode === "both") && project.terminal) {
      for (const path of project.paths) {
        await open(path, project.terminal.bundleId);
      }
    }

    // Record last opened time
    await updateLastOpened(project.id);

    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open project",
      message: String(error),
    });
    return false;
  }
}

export async function openProjectWithHUD(project: Project): Promise<void> {
  const success = await openProjectInApp(project);

  if (success) {
    const openMode: OpenMode = project.openMode ?? "ide";
    let message = "";

    if (openMode === "ide") {
      message = `Opening ${project.alias} in ${project.app.name}`;
    } else if (openMode === "terminal" && project.terminal) {
      message = `Opening ${project.alias} in ${project.terminal.name}`;
    } else if (openMode === "both" && project.terminal) {
      message = `Opening ${project.alias} in ${project.app.name} + ${project.terminal.name}`;
    } else {
      message = `Opening ${project.alias}`;
    }

    await showHUD(message);
  }
}

export async function openProjectWithToast(project: Project): Promise<void> {
  const success = await openProjectInApp(project);

  if (success) {
    const openMode: OpenMode = project.openMode ?? "ide";
    let title = "";

    if (openMode === "ide") {
      title = `Opening in ${project.app.name}`;
    } else if (openMode === "terminal" && project.terminal) {
      title = `Opening in ${project.terminal.name}`;
    } else if (openMode === "both" && project.terminal) {
      title = `Opening in ${project.app.name} + ${project.terminal.name}`;
    } else {
      title = "Opening project";
    }

    await showToast({
      style: Toast.Style.Success,
      title,
      message: project.alias,
    });
  }
}
