import { join } from "path";
import { fileURLToPath } from "url";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { showToast, Toast, showHUD, getPreferenceValues } from "@raycast/api";
import * as fs from "fs/promises";
import { Rule } from "../types";
import { showFailureToast } from "./utils";

const execPromise = promisify(exec);

interface Preferences {
  preferredEditor: string;
}

const editorSupportPathMap: Record<string, string> = {
  Code: "Code",
  "Code - Insiders": "Code - Insiders",
  VSCodium: "VSCodium",
  "VSCodium - Insiders": "VSCodium - Insiders",
  Cursor: "Cursor",
};

export function getEditorSupportPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  const preferredEditor = preferences.preferredEditor;

  const supportPathName = editorSupportPathMap[preferredEditor];

  if (!supportPathName) {
    throw new Error(`Unknown preferred editor: ${preferredEditor}`);
  }

  return join(os.homedir(), `Library/Application Support/${supportPathName}`);
}

export async function isVSCodeActive(): Promise<boolean> {
  try {
    const { stdout } = await execPromise(
      `osascript -e 'tell application "System Events"
 set frontApp to first application process whose frontmost is true
 set appPath to POSIX path of (application file of frontApp as alias)
 end tell

 set displayName to do shell script "mdls -name kMDItemDisplayName -raw " & quoted form of appPath

 return displayName'`,
    );
    const activeAppName = stdout.trim();
    const preferences = getPreferenceValues<Preferences>();
    const preferredEditor = preferences.preferredEditor;

    const supportPathName = editorSupportPathMap[preferredEditor];
    return activeAppName.includes(supportPathName) || activeAppName === `${supportPathName}.app`;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function getMostRecentProjectPath(): Promise<string | undefined> {
  let supportPath: string;
  try {
    supportPath = getEditorSupportPath();
  } catch (error) {
    showFailureToast(
      "Error Finding Project Path",
      error instanceof Error ? error.message : "Could not determine VS Code support path.",
    );
    return undefined;
  }

  const stateDbPath = join(supportPath, "User/globalStorage/state.vscdb");

  const query = "SELECT json_extract(value, '$.entries') FROM ItemTable WHERE key = 'history.recentlyOpenedPathsList'";
  const command = `sqlite3 "${stateDbPath}" "${query}"`;

  try {
    const { stdout } = await execPromise(command);

    if (!stdout) {
      showToast({
        title: "No Recent Project Found",
        message: "Could not retrieve recent projects from the database.",
        style: Toast.Style.Failure,
      });
      return undefined;
    }

    const recentEntries = JSON.parse(stdout);

    interface RecentEntry {
      folderUri?: string;
      workspace?: string;
    }

    let mostRecentEntry: RecentEntry | undefined = undefined;

    if (recentEntries && Array.isArray(recentEntries) && recentEntries.length > 0) {
      mostRecentEntry = recentEntries.find((entry: RecentEntry) => {
        const uri = entry.folderUri || entry.workspace;
        return uri && (uri.startsWith("file://") || !uri.includes(":"));
      });
    }

    if (mostRecentEntry) {
      const uri = mostRecentEntry.folderUri || mostRecentEntry.workspace;
      if (uri && uri.startsWith("file://")) {
        return fileURLToPath(uri);
      } else if (uri) {
        return uri;
      }
    }

    showToast({
      title: "No Recent Project Found",
      message: "Could not find a recent local VS Code project after parsing database results.",
      style: Toast.Style.Failure,
    });
    return undefined;
  } catch (error) {
    if (error instanceof Error && error.message.includes("unable to open database file")) {
      showFailureToast(
        "Error Finding Project Path",
        `VS Code state database not found at ${stateDbPath}. Please ensure your preferred editor is correct and has been opened recently.`,
      );
    } else {
      showFailureToast(
        "Error Finding Project Path",
        `Could not determine recent VS Code project path: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return undefined;
  }
}

export async function applyRuleToFileSystem(rule: Rule): Promise<void> {
  try {
    const vscodeIsActive = await isVSCodeActive();

    if (!vscodeIsActive) {
      const errorMessage = "VS Code is not the active application.";
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not apply rule",
        message: errorMessage,
      });
      return;
    }
  } catch (error) {
    showFailureToast(
      "Could not apply rule",
      `Error checking active application: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  let projectPath: string | undefined = undefined;
  try {
    projectPath = await getMostRecentProjectPath();
  } catch (error) {
    showFailureToast(
      "Could not apply rule",
      `Error getting project path: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }

  if (!projectPath) {
    showFailureToast("Could not apply rule", "Could not determine the most recent VS Code project path.");
    return;
  }

  const ruleDirectory = rule.modeSlug
    ? join(projectPath, ".roo", `rules-${rule.modeSlug}`)
    : join(projectPath, ".roo", "rules");
  const ruleFilePath = join(ruleDirectory, `${rule.ruleIdentifier}.md`);

  try {
    await fs.mkdir(ruleDirectory, { recursive: true });
    // Check if file exists
    let fileExists = false;
    try {
      await fs.stat(ruleFilePath);
      fileExists = true;
    } catch (statError: unknown) {
      if (
        statError instanceof Error &&
        typeof (statError as { code?: string }).code === "string" &&
        (statError as { code?: string }).code !== "ENOENT"
      ) {
        throw statError;
      }
    }

    if (fileExists) {
      showHUD("Rule already exists, skipping write");
    } else {
      await fs.writeFile(ruleFilePath, rule.content, "utf8");
      showHUD("Rule Applied");
    }
  } catch (error) {
    if (error instanceof Error && (error.message.includes("EACCES") || error.message.includes("ENOENT"))) {
      showFailureToast("Failed to apply rule", `File system error: ${error.message}`);
    } else {
      showFailureToast("Failed to apply rule", error instanceof Error ? error.message : String(error));
    }
  }
}
