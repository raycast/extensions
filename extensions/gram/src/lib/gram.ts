import { homedir } from "os";
import { getApplications } from "@raycast/api";
import { execWithCleanEnv } from "./utils";
import { gramBuild } from "./preferences";
import fs from "fs";
import { runAppleScript } from "@raycast/utils";

export type GramBuild = Preferences["build"];
export type GramBundleId = "app.liten.Gram" | "app.liten.Gram-Dev";

const BuildMetadata: Record<
  GramBuild,
  { bundleId: GramBundleId; dbName: string; cli: string; appCli: string; processName: string }
> = {
  Gram: {
    bundleId: "app.liten.Gram",
    dbName: "0-stable",

    cli: "/usr/local/bin/gram",
    appCli: "/Applications/Gram.app/Contents/MacOS/cli",
    processName: "Gram",
  },
  "Gram Dev": {
    bundleId: "app.liten.Gram-Dev",
    dbName: "0-dev",
    cli: "/usr/local/bin/gram-dev",
    appCli: "/Applications/Gram Dev.app/Contents/MacOS/cli",
    processName: "Gram Dev",
  },
};

export function getGramBundleId(build: GramBuild = gramBuild): GramBundleId {
  return BuildMetadata[build].bundleId;
}

export function getGramDbPath(build: GramBuild = gramBuild): string {
  const { dbName } = BuildMetadata[build];
  return `${homedir()}/Library/Application Support/Gram/db/${dbName}/db.sqlite`;
}

export async function getGramApp() {
  const applications = await getApplications();
  const bundleId = getGramBundleId(gramBuild);
  return applications.find((a) => a.bundleId === bundleId);
}

/**
 * Get the path to the Gram CLI executable.
 * First checks for the installed CLI (via "gram: install cli"), then falls back to the app bundle CLI.
 * Returns null if no CLI is found.
 */
export function getGramCliPath(build: GramBuild = gramBuild): string | null {
  const { cli, appCli } = BuildMetadata[build];
  if (fs.existsSync(cli)) return cli;
  if (fs.existsSync(appCli)) return appCli;
  return null;
}

export async function closeGramWindow(windowTitle: string, build: GramBuild = gramBuild): Promise<boolean> {
  const { processName } = BuildMetadata[build];
  const escapedTitle = windowTitle.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

  const script = `
      tell application "System Events"
        tell process "${processName}"
          set targetWindow to first window whose name contains "${escapedTitle}"
          if exists targetWindow then
            click (first button of targetWindow whose description is "close button")
            return "true"
          end if
          return "false"
        end tell
      end tell
    `;

  try {
    return (await runAppleScript(script)) === "true";
  } catch (error) {
    console.error("Failed to close Gram window:", error);
    return false;
  }
}

/**
 * Open a workspace with multiple paths using the Gram CLI.
 * This is required for multi-folder workspaces since the URI scheme only supports a single path.
 *
 * Uses a clean environment to prevent Raycast's environment variables from
 * being inherited by Gram terminals.
 *
 * @param cliPath - Path to the Gram CLI executable
 * @param paths - Array of paths to open (supports multiple folders)
 * @param newWindow - Whether to open in a new window (default: false)
 * @returns Promise that resolves when the command completes
 */
export async function openWithGramCli(cliPath: string, paths: string[], newWindow = false): Promise<void> {
  const args = newWindow ? ["-n", ...paths] : paths;

  try {
    await execWithCleanEnv(cliPath, args);
  } catch (error) {
    console.error("Failed to open with Gram CLI:", error);
    throw error;
  }
}
