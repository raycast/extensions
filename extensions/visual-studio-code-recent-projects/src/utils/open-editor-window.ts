import { environment } from "@raycast/api";
import { existsSync } from "node:fs";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import { getEditorApplication } from "./editor";
import { VSCodeBuild } from "../lib/types";
import { isMac } from "../lib/utils";

const execute = promisify(execFile);
const macBundleNames: Record<string, string> = {
  [VSCodeBuild.Cursor]: "Cursor.app",
  [VSCodeBuild.Code]: "Visual Studio Code.app",
  [VSCodeBuild.CodeInsiders]: "Visual Studio Code - Insiders.app",
};

interface FocusResult {
  status: "stopped" | "focused" | "missing" | "busy" | "permission" | "error";
}

async function launchDetached(executable: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(executable, args, { detached: true, stdio: "ignore" });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export async function openEditorWindow(buildName: string) {
  return openBuildWindow(buildName, "ide");
}

export async function openAgentsWindow(buildName: string) {
  return openBuildWindow(buildName, "agents");
}

async function openBuildWindow(buildName: string, target: "ide" | "agents") {
  const app = await getEditorApplication(buildName);
  // Newly installed apps may not be present in Raycast's application list yet.
  // Resolve known bundles on disk for both IDE and Agents instead of reporting
  // a missing installation solely because application discovery missed it.
  const macBundleName = macBundleNames[buildName];
  let fallbackPath: string | undefined;
  if (isMac && macBundleName) {
    fallbackPath = ["/Applications", path.join(os.homedir(), "Applications")]
      .map((directory) => path.join(directory, macBundleName))
      .find(existsSync);
  } else if (!isMac && buildName === VSCodeBuild.Cursor) {
    fallbackPath = path.join(os.homedir(), "AppData", "Local", "Programs", "cursor", "Cursor.exe");
  }
  const appPath = app?.path && existsSync(app.path) ? app.path : fallbackPath;
  if (!appPath || !existsSync(appPath)) throw new Error(`${buildName} is not installed.`);

  const viewLabel = target === "agents" ? "Agents" : "editor";
  const args =
    buildName === VSCodeBuild.Cursor
      ? [target === "agents" ? "--glass" : "--classic", "--new-window"]
      : target === "agents"
        ? ["--agents"]
        : ["--new-window"];
  if (!isMac) {
    await launchDetached(appPath, args);
    return;
  }

  // A compiled helper queries AppKit/AX directly, never System Events.
  // Quit-app detection returns before any Accessibility work.
  const helperPath = path.join(environment.assetsPath, "open-editor-helper");
  const { stdout } = await execute(helperPath, [appPath, target], { timeout: 4_000 });
  const result: FocusResult = JSON.parse(stdout);
  if (result.status === "focused") return;
  if (result.status === "permission") {
    throw new Error("Enable Raycast in System Settings > Privacy & Security > Accessibility.");
  }
  if (result.status === "busy") {
    // Do not create another window when AX cannot tell whether one already exists.
    throw new Error(`${buildName} is not responding to window controls yet. Try again when it is ready.`);
  }
  if (result.status === "stopped") {
    await execute("/usr/bin/open", ["-a", appPath, "--args", ...args], { timeout: 5_000 });
    // Hand startup to the app. Do not block the command waiting for AX or menus.
    return;
  }
  if (result.status !== "missing") throw new Error(`Could not inspect ${buildName}'s ${viewLabel} windows.`);

  // A running app ignores Launch Services arguments. Forward the explicit target
  // request to its executable only when the native query confirms that view is missing.
  const executable = path.join(appPath, "Contents", "MacOS", buildName === VSCodeBuild.Cursor ? "Cursor" : "Electron");
  if (!existsSync(executable)) throw new Error(`Cannot find the ${buildName} executable.`);
  await launchDetached(executable, args);
}
