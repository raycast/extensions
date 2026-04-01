import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";
import { Project, WarpTemplate } from "../types";
import { environment } from "@raycast/api";
import { shellCd } from "./shellQuote";

const execFileAsync = promisify(execFile);
const DEBUG = environment.isDevelopment;
const GHOSTTY_APP_NAME = "Ghostty";
const GHOSTTY_SPLIT_DIRECTIONS = {
  vertical: "right",
  horizontal: "down",
} as const;

function toAppleScriptString(value: string): string {
  const parts = value.replace(/\r\n/g, "\n").split("\n");
  const escapedParts = parts.map((part) => `"${part.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  return escapedParts.join(" & linefeed & ");
}

function toShellCdCommand(workingDir: string): string {
  return shellCd(workingDir);
}

async function runAppleScript(script: string): Promise<string> {
  const { stdout } = await execFileAsync("osascript", ["-e", script]);
  return stdout.trim();
}

async function isGhosttyRunning(): Promise<boolean> {
  try {
    const result = await execFileAsync("pgrep", ["-x", GHOSTTY_APP_NAME]);
    return result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}

function resolveWorkingDir(project: Project, command?: WarpTemplate["commands"][number]): string {
  if (command?.workingDirectory) {
    return join(project.path, command.workingDirectory);
  }
  return project.path;
}

function buildSurfaceConfiguration(varName: string, workingDir: string): string[] {
  return [
    `set ${varName} to new surface configuration`,
    `set initial working directory of ${varName} to ${toAppleScriptString(workingDir)}`,
  ];
}

function buildInputStatements(termVar: string, command: string): string[] {
  return [`input text ${toAppleScriptString(command)} to ${termVar}`, `send key "enter" to ${termVar}`];
}

function buildApplyWorkingDirStatements(termVar: string, workingDir: string): string[] {
  return buildInputStatements(termVar, toShellCdCommand(workingDir));
}

function buildMaybeRunCommandStatements(termVar: string, command: string | undefined, autoRun: boolean): string[] {
  if (!autoRun) return [];
  const trimmed = command?.trim();
  if (!trimmed) return [];
  return buildInputStatements(termVar, trimmed);
}

function buildGhosttyLaunchScript(project: Project, template: WarpTemplate, running: boolean): string {
  const firstCommand = template.commands[0];

  if (!firstCommand) {
    throw new Error("A template must include at least one command.");
  }

  const autoRun = template.ghosttyAutoRun === true;
  const splitDirection = GHOSTTY_SPLIT_DIRECTIONS[template.splitDirection ?? "vertical"];
  const lines = [`tell application "${GHOSTTY_APP_NAME}"`, "activate"];

  if (running && template.launchMode === "split-panes") {
    lines.push("if (count of windows) = 0 then");
    lines.push(
      ...buildSurfaceConfiguration("cfgRoot", resolveWorkingDir(project, firstCommand)).map((line) => `  ${line}`),
    );
    lines.push("  set rootWindow to new window with configuration cfgRoot");
    lines.push("  set rootTerminal to focused terminal of selected tab of rootWindow");
    lines.push("else");
    lines.push("  set rootWindow to front window");
    lines.push("  set rootTerminal to focused terminal of selected tab of rootWindow");
    lines.push(
      ...buildApplyWorkingDirStatements("rootTerminal", resolveWorkingDir(project, firstCommand)).map(
        (line) => `  ${line}`,
      ),
    );
    lines.push("end if");
  } else {
    lines.push(...buildSurfaceConfiguration("cfgRoot", resolveWorkingDir(project, firstCommand)));

    if (running && template.launchMode === "multi-tab") {
      lines.push("if (count of windows) = 0 then");
      lines.push("  set rootWindow to new window with configuration cfgRoot");
      lines.push("  set rootTerminal to focused terminal of selected tab of rootWindow");
      lines.push("else");
      lines.push("  set rootWindow to front window");
      lines.push("  set rootTab to new tab in rootWindow with configuration cfgRoot");
      lines.push("  set rootTerminal to focused terminal of rootTab");
      lines.push("end if");
    } else {
      lines.push("set rootWindow to new window with configuration cfgRoot");
      lines.push("set rootTerminal to focused terminal of selected tab of rootWindow");
    }
  }

  lines.push(...buildMaybeRunCommandStatements("rootTerminal", firstCommand.command, autoRun));
  lines.push("set currentTerminal to rootTerminal");

  template.commands.slice(1).forEach((command, index) => {
    const configVar = `cfg${index + 1}`;
    const termVar = `term${index + 1}`;
    lines.push(...buildSurfaceConfiguration(configVar, resolveWorkingDir(project, command)));

    if (template.launchMode === "multi-window") {
      lines.push(`set newWindow to new window with configuration ${configVar}`);
      lines.push(`set ${termVar} to focused terminal of selected tab of newWindow`);
    } else if (template.launchMode === "multi-tab") {
      lines.push(`set newTab to new tab in rootWindow with configuration ${configVar}`);
      lines.push(`set ${termVar} to focused terminal of newTab`);
    } else {
      lines.push(`set ${termVar} to split currentTerminal direction ${splitDirection} with configuration ${configVar}`);
    }

    lines.push(`set currentTerminal to ${termVar}`);
    lines.push(...buildMaybeRunCommandStatements("currentTerminal", command.command, autoRun));
  });

  lines.push("focus rootTerminal", "end tell");

  return lines.join("\n");
}

/**
 * Checks whether Ghostty is installed.
 */
export async function checkGhosttyInstalled(): Promise<boolean> {
  try {
    await execFileAsync("which", ["ghostty"]);
    return true;
  } catch {
    try {
      await execFileAsync("ls", ["/Applications/Ghostty.app"]);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Launches a project in Ghostty using the native AppleScript API.
 *
 * macOS may prompt for Automation permission the first time Raycast controls Ghostty.
 */
export async function launchGhosttyProject(project: Project, template: WarpTemplate): Promise<void> {
  try {
    if (DEBUG) {
      console.log("Launching Ghostty with project:", {
        project: project.name,
        template: template.name,
        commands: template.commands,
      });
    }

    const running = await isGhosttyRunning();
    const script = buildGhosttyLaunchScript(project, template, running);

    if (DEBUG) {
      console.log("Ghostty launch mode:", template.launchMode);
      console.log("Ghostty running:", running);
      console.log("Ghostty AppleScript:");
      console.log(script);
    }

    await runAppleScript(script);

    // Keep manual commands visible when auto-run is disabled.
    if (!template.ghosttyAutoRun && template.commands.some((cmd) => cmd.command.trim())) {
      console.log("Ghostty opened the project directory. Run these commands manually if needed:");
      template.commands.forEach((cmd, index) => {
        if (cmd.command.trim()) {
          console.log(`   ${index + 1}. ${cmd.title}: ${cmd.command}`);
        }
      });
    }
  } catch (error) {
    console.error("Launch Ghostty failed:", error);
    throw new Error(`Failed to launch Ghostty: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Opens a project in Ghostty without applying a template.
 */
export async function launchGhosttySimple(project: Project): Promise<void> {
  try {
    if (DEBUG) {
      console.log("Launching Ghostty simple mode:", project.name);
      console.log("Project path:", project.path);
    }

    const running = await isGhosttyRunning();
    const lines = [
      `tell application "${GHOSTTY_APP_NAME}"`,
      "activate",
      ...buildSurfaceConfiguration("cfgRoot", project.path),
    ];

    if (running) {
      lines.push("if (count of windows) = 0 then");
      lines.push("  set rootWindow to new window with configuration cfgRoot");
      lines.push("else");
      lines.push("  set rootWindow to front window");
      lines.push("  set rootTab to new tab in rootWindow with configuration cfgRoot");
      lines.push("end if");
    } else {
      lines.push("set rootWindow to new window with configuration cfgRoot");
    }
    lines.push("end tell");

    const script = lines.join("\n");
    if (DEBUG) {
      console.log("Ghostty simple AppleScript:");
      console.log(script);
    }

    await runAppleScript(script);
  } catch (error) {
    throw new Error(`Failed to launch Ghostty: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Prints basic Ghostty diagnostics to the development console.
 */
export async function debugGhosttyEnvironment(): Promise<void> {
  console.log("Starting Ghostty environment diagnostics...");

  // 1. Check the Ghostty CLI path.
  try {
    const result = await execFileAsync("which", ["ghostty"]);
    console.log("Ghostty CLI path:", result.stdout.trim());
  } catch {
    console.log("Ghostty CLI not found");
  }

  // 2. Check whether the app bundle exists.
  try {
    await execFileAsync("ls", ["-la", "/Applications/Ghostty.app"]);
    console.log("Ghostty.app installed");
  } catch {
    console.log("Ghostty.app not found in /Applications");
  }

  // 3. Verify the app can be opened.
  try {
    console.log("Testing basic app launch...");
    await execFileAsync("open", ["-a", "Ghostty"]);
    console.log("Basic app launch succeeded");
  } catch (error) {
    console.log("Basic app launch failed:", error);
  }

  // 4. Verify the AppleScript bridge.
  try {
    console.log("Testing AppleScript bridge...");
    const version = await runAppleScript(`tell application "${GHOSTTY_APP_NAME}" to get version`);
    console.log("AppleScript bridge available, Ghostty version:", version || "<unknown>");
  } catch (error) {
    console.log("AppleScript test failed (permission may be missing or macos-applescript may be disabled):", error);
  }

  console.log("Ghostty environment diagnostics complete");
}
