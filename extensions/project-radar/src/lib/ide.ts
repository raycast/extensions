import { showToast, Toast, showHUD, open, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Project, OpenMode } from "../types";
import { updateLastOpened } from "./storage";
import { createTerminalExecutor } from "./terminal";

// ============================================
// Project Open Operations
// ============================================

export async function openProjectInApp(project: Project): Promise<boolean> {
  const openMode: OpenMode = project.openMode ?? "ide";

  try {
    // Close Raycast window first if opening terminal (needed for Warp UI scripting)
    if (openMode === "terminal" || openMode === "both") {
      await closeMainWindow();
    }

    // Open in IDE
    if (openMode === "ide" || openMode === "both") {
      for (const path of project.paths) {
        await open(path, project.app.bundleId);
      }
    }

    // Open in Terminal
    if ((openMode === "terminal" || openMode === "both") && project.terminal) {
      const executor = createTerminalExecutor(project.terminal.bundleId);
      for (const path of project.paths) {
        await executor.execute({
          path,
          bundleId: project.terminal.bundleId,
          command: project.terminalCommand,
        });
      }
    }

    // Record last opened time
    await updateLastOpened(project.id);

    return true;
  } catch (error) {
    await showFailureToast(error, { title: "Failed to open project" });
    return false;
  }
}

export async function openProjectWithHUD(project: Project): Promise<void> {
  const success = await openProjectInApp(project);

  if (success) {
    const message = buildOpenMessage(project);
    await showHUD(message);
  }
}

export async function openProjectWithToast(project: Project): Promise<void> {
  const success = await openProjectInApp(project);

  if (success) {
    const title = buildOpenMessage(project);
    await showToast({
      style: Toast.Style.Success,
      title,
      message: project.alias,
    });
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Build a descriptive target string for opening a project
 * Examples:
 * - "VS Code"
 * - "Warp"
 * - "Warp → claude"
 * - "VS Code + Warp"
 * - "VS Code + Warp → claude"
 */
export function buildOpenTarget(project: Project): string {
  const openMode: OpenMode = project.openMode ?? "ide";
  const parts: string[] = [];

  // IDE part
  if (openMode === "ide" || openMode === "both") {
    parts.push(project.app.name);
  }

  // Terminal part
  if ((openMode === "terminal" || openMode === "both") && project.terminal) {
    let terminalPart = project.terminal.name;
    if (project.terminalCommand) {
      terminalPart += ` → ${project.terminalCommand}`;
    }
    parts.push(terminalPart);
  }

  return parts.length > 0 ? parts.join(" + ") : project.app.name;
}

/**
 * Build a descriptive message for opening a project (with "Opening in" prefix)
 */
function buildOpenMessage(project: Project): string {
  const target = buildOpenTarget(project);
  return `Opening in ${target}`;
}
