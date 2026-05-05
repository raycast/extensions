import { closeMainWindow } from "@raycast/api";
import path from "path";
import { spawn } from "child_process";

import { PreferredApp, ProjectRecord, ResolvedProjectApp } from "./types";

export function resolveProjectApps(
  project: ProjectRecord,
  defaultIdeApp: PreferredApp,
  defaultTerminalApp: PreferredApp,
): {
  ideApp: ResolvedProjectApp;
  terminalApp: ResolvedProjectApp;
} {
  return {
    ideApp: resolveApp(project.ideAppPath, defaultIdeApp),
    terminalApp: resolveApp(project.terminalAppPath, defaultTerminalApp),
  };
}

export async function quickOpenProject(
  projectPath: string,
  ideApp: ResolvedProjectApp,
  terminalApp: ResolvedProjectApp,
): Promise<void> {
  await Promise.all([openProjectInApp(projectPath, ideApp), openProjectInApp(projectPath, terminalApp)]);
  await closeMainWindow();
}

export async function openProjectInApp(
  projectPath: string,
  app: PreferredApp,
  shouldCloseMainWindow = false,
): Promise<void> {
  await launchApp(app.path, projectPath);

  if (shouldCloseMainWindow) {
    await closeMainWindow();
  }
}

function resolveApp(overridePath: string | undefined, defaultApp: PreferredApp): ResolvedProjectApp {
  if (!overridePath) {
    return {
      ...defaultApp,
      source: "default",
    };
  }

  return {
    name: getApplicationNameFromPath(overridePath),
    path: overridePath,
    source: "project",
  };
}

function getApplicationNameFromPath(appPath: string): string {
  const baseName = path.basename(appPath);
  return baseName.replace(/\.app$/i, "").replace(/\.exe$/i, "");
}

function launchApp(appPath: string, targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child =
      process.platform === "win32"
        ? spawn("cmd", ["/c", "start", "", appPath, targetPath], { detached: true, stdio: "ignore" })
        : spawn("open", ["-a", appPath, targetPath], { detached: true, stdio: "ignore" });

    child.once("error", reject);
    child.on("close", () => {
      resolve();
    });
    child.unref();
  });
}
