import { showToast, Toast, LocalStorage } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

type ToolId = "claude" | "gemini" | "qwen";
type PackageManagerId = "npm" | "pnpm" | "yarn";
type TerminalId = "terminal" | "iterm" | "custom";

interface Settings {
  defaultVibeAgent: ToolId;
  packageManager: PackageManagerId;
  yoloEnabled: boolean;
  defaultTerminal: TerminalId;
  customTerminal?: string;
}

const DEFAULT_SETTINGS: Settings = {
  defaultVibeAgent: "claude",
  packageManager: "npm",
  yoloEnabled: false,
  defaultTerminal: "terminal",
};

const AGENT_COMMANDS: Record<ToolId, string> = {
  claude: "claude",
  gemini: "gemini",
  qwen: "qwen",
};

const YOLO_AGENT_ARGS: Record<ToolId, string> = {
  claude: "--dangerously-skip-permissions",
  gemini: "-y",
  qwen: "-y",
  yolo: "",
};

async function loadSettings(): Promise<Settings> {
  try {
    const storedSettings = await LocalStorage.getItem<string>("easy-vibe-settings");
    if (storedSettings) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(storedSettings) };
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  }
  return DEFAULT_SETTINGS;
}

async function runInLoginShell(
  command: string,
  shell: "zsh" | "bash" = "zsh",
): Promise<{ stdout: string; stderr: string }> {
  const quoted = command.replace(/"/g, '\\"');
  const shellProgram = shell === "zsh" ? "/bin/zsh" : "/bin/bash";
  const { stdout, stderr } = await execAsync(`${shellProgram} -lc "${quoted}"`);
  return { stdout: stdout?.toString() ?? "", stderr: stderr?.toString() ?? "" };
}

async function getCurrentDirectory(): Promise<string> {
  try {
    // Try to get the current directory from the frontmost Finder window
    const { stdout } = await execAsync(`osascript -e '
      tell application "Finder"
        if exists (front window) then
          set currentFolder to (target of front window) as alias
          return POSIX path of currentFolder
        else
          return (home directory) as text
        end if
      end tell
    '`);

    const result = stdout.trim();
    if (result && result !== "missing value" && result !== "/" && result !== ".") {
      return result;
    }

    // Fallback to user's home directory
    const { stdout: homeDir } = await runInLoginShell("echo $HOME", "zsh");
    const homeResult = homeDir.trim();
    if (homeResult && homeResult !== "/" && homeResult !== ".") {
      return homeResult;
    }

    throw new Error("Unable to determine current directory");
  } catch (error) {
    console.error("Error getting current directory:", error);
    throw new Error(`Failed to get current directory: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function launchAgentInTerminal(
  agentCommand: string,
  terminalId: TerminalId,
  customTerminal?: string,
  yoloMode: boolean = false,
): Promise<void> {
  try {
    let currentDir: string;

    try {
      currentDir = await getCurrentDirectory();
    } catch (dirError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to get current directory",
        message: dirError instanceof Error ? dirError.message : "Unknown error",
      });
      return;
    }

    let terminalName: string;
    let appleScript: string;

    switch (terminalId) {
      case "terminal":
        terminalName = "Terminal";
        appleScript = `
          tell application "Terminal"
            activate
            do script "cd '${currentDir}' && ${agentCommand}${yoloMode ? " " + YOLO_AGENT_ARGS[agentCommand as ToolId] : ""}"
          end tell
        `;
        break;
      case "iterm":
        terminalName = "iTerm";
        appleScript = `tell application "iTerm"
    activate
    create window with default profile
    tell current window
        tell current session
            write text "cd '${currentDir}' && ${agentCommand}${yoloMode ? " " + YOLO_AGENT_ARGS[agentCommand as ToolId] : ""}"
        end tell
    end tell
end tell`;
        break;
      case "custom":
        if (!customTerminal) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Custom terminal not configured",
            message: "Please set a custom terminal name in settings",
          });
          return;
        }
        terminalName = customTerminal;
        appleScript = `
          tell application "${customTerminal}"
            activate
            tell application "System Events"
              keystroke "cd '${currentDir}' && ${agentCommand}${yoloMode ? " " + YOLO_AGENT_ARGS[agentCommand as ToolId] : ""}"
              keystroke return
            end tell
          end tell
        `;
        break;
      default:
        terminalName = "Terminal";
        appleScript = `
          tell application "Terminal"
            activate
            do script "cd '${currentDir}' && ${agentCommand}"
          end tell
        `;
    }

    const { stderr } = await execAsync(`osascript -e '${appleScript}'`);

    if (stderr) {
      console.warn("AppleScript warning:", stderr);
    }

    await showToast({
      style: Toast.Style.Success,
      title: `${terminalName} launched`,
      message: `${agentCommand} started in ${currentDir}`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to launch terminal",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export default async function Command() {
  try {
    const settings = await loadSettings();
    const defaultAgent = settings.defaultVibeAgent;
    const agentCommand = AGENT_COMMANDS[defaultAgent];

    await launchAgentInTerminal(agentCommand, settings.defaultTerminal, settings.customTerminal, settings.yoloEnabled);

    // Exit immediately after launching
    process.exit(0);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to launch AI agent",
      message: error instanceof Error ? error.message : "Unknown error",
    });

    // Exit with error code
    process.exit(1);
  }
}
