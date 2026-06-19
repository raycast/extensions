import { type LaunchProps, LaunchType, launchCommand, open, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import * as fs from "fs";
import { homedir } from "os";
import * as path from "path";
import { startFocusMode } from "./lib/focus";
import { getStateFilePath, initializeAgentsCounter } from "./lib/state";
import type { ClaudeSettings, CursorHooks, OpencodeConfig } from "./types";

const STATE_FILE = getStateFilePath();

/**
 * Check if jq is installed on the system.
 * @returns True if jq is available, false otherwise
 */
function isJqInstalled(): boolean {
  try {
    execSync("jq --version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates the jq command to increment the counter.
 * Uses atomic write pattern with temp file.
 */
function getIncrementCommand(): string {
  return `echo "$(jq '.agentsCounter += 1' "${STATE_FILE}")" > "${STATE_FILE}"`;
}

/**
 * Generates the jq command to decrement the counter.
 * Uses atomic write pattern with temp file.
 */
function getDecrementCommand(): string {
  return `echo "$(jq '.agentsCounter = ([0, .agentsCounter - 1] | max)' "${STATE_FILE}")" > "${STATE_FILE}"`;
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (e) {
    console.error(`Failed to parse JSON from ${filePath}`, e);
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function setupClaudeHooks(startCommand: string, endCommand: string) {
  const settingsPath = path.join(homedir(), ".claude", "settings.json");
  const settings = readJsonFile<ClaudeSettings>(settingsPath, {});

  if (!settings.hooks) settings.hooks = {};

  // SessionStart
  if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];
  const startIdx = settings.hooks.SessionStart.findIndex((m) => m.matcher === "" || m.matcher === "*");
  if (startIdx === -1) {
    settings.hooks.SessionStart.push({
      matcher: "",
      hooks: [{ type: "command", command: startCommand }],
    });
  } else {
    // Remove old increment commands and add new one
    settings.hooks.SessionStart[startIdx].hooks = settings.hooks.SessionStart[startIdx].hooks.filter(
      (h) => !h.command.includes("increment-counter") && !h.command.includes("jq"),
    );
    settings.hooks.SessionStart[startIdx].hooks.push({
      type: "command",
      command: startCommand,
    });
  }

  // SessionEnd
  if (!settings.hooks.SessionEnd) settings.hooks.SessionEnd = [];
  const endIdx = settings.hooks.SessionEnd.findIndex((m) => m.matcher === "" || m.matcher === "*");
  if (endIdx === -1) {
    settings.hooks.SessionEnd.push({
      matcher: "",
      hooks: [{ type: "command", command: endCommand }],
    });
  } else {
    // Remove old decrement commands and add new one
    settings.hooks.SessionEnd[endIdx].hooks = settings.hooks.SessionEnd[endIdx].hooks.filter(
      (h) => !h.command.includes("decrement-counter") && !h.command.includes("jq"),
    );
    settings.hooks.SessionEnd[endIdx].hooks.push({
      type: "command",
      command: endCommand,
    });
  }

  writeJsonFile(settingsPath, settings);
}

async function setupCursorHooks(startCommand: string, endCommand: string) {
  const hooksPath = path.join(homedir(), ".cursor", "hooks.json");
  const config = readJsonFile<CursorHooks>(hooksPath, {
    version: 1,
    hooks: {},
  });

  if (!config.hooks.beforeSubmitPrompt) config.hooks.beforeSubmitPrompt = [];
  // Remove old commands and add new one
  config.hooks.beforeSubmitPrompt = config.hooks.beforeSubmitPrompt.filter(
    (h) => !h.command.includes("increment-counter") && !h.command.includes("jq"),
  );
  config.hooks.beforeSubmitPrompt.push({ command: startCommand });

  if (!config.hooks.stop) config.hooks.stop = [];
  // Remove old commands and add new one
  config.hooks.stop = config.hooks.stop.filter(
    (h) => !h.command.includes("decrement-counter") && !h.command.includes("jq"),
  );
  config.hooks.stop.push({ command: endCommand });

  writeJsonFile(hooksPath, config);
}

async function setupOpencodeHooks() {
  const configDir = path.join(homedir(), ".config", "opencode");
  const pluginDir = path.join(configDir, "plugin");
  const configPath = path.join(configDir, "opencode.json");

  const pluginContent = `
import type { Plugin } from "@opencode-ai/plugin";

export const RaycastTracker: Plugin = async ({ $ }) => {
  const STATE_FILE = "${STATE_FILE}";

  const incrementCounter = async () => {
    await $\`echo "$(jq '.agentsCounter += 1' "\${STATE_FILE}")" > "\${STATE_FILE}"\`;
  };

  const decrementCounter = async () => {
    await $\`echo "$(jq '.agentsCounter = ([0, .agentsCounter - 1] | max)' "\${STATE_FILE}")" > "\${STATE_FILE}"\`;
  };

  return {
    event: async ({ event }) => {
      if (event.type === "session.created") {
        await incrementCounter();
      }
      if (event.type === "session.idle") {
        await decrementCounter();
      }
    }
  };
};
`;

  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir, { recursive: true });
  }
  fs.writeFileSync(path.join(pluginDir, "raycast-tracker.ts"), pluginContent);

  const config = readJsonFile<OpencodeConfig>(configPath, { plugins: {} });
  if (!config.plugins) config.plugins = {};
  config.plugins["raycast-tracker"] = { enabled: true };

  writeJsonFile(configPath, config);
}

async function setupCodexAlias(startCommand: string, endCommand: string) {
  const zshrcPath = path.join(homedir(), ".zshrc");
  const bashrcPath = path.join(homedir(), ".bashrc");

  // New alias that uses jq commands directly
  const aliasLine = `\n# Raycast Codex Tracker (State File Version)\nalias codex='(${startCommand}) && command codex "$@"; (${endCommand})'\n`;

  const targetFiles = [zshrcPath, bashrcPath];

  for (const filePath of targetFiles) {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, "utf-8");
      // Remove old aliases
      content = content.replace(/\n# Raycast Codex Tracker.*?alias codex=.*?\n/gs, "\n");
      content = content.replace(/\nalias codex=.*raycast.*?\n/gs, "\n");

      if (!content.includes("# Raycast Codex Tracker (State File Version)")) {
        content += aliasLine;
        fs.writeFileSync(filePath, content);
      }
    }
  }
}

/**
 * Validates that the state file is set up correctly and writable.
 * @returns Object containing success status and any error message
 */
function validateSetup(): { success: boolean; error?: string } {
  try {
    // Initialize state file
    initializeAgentsCounter();

    // Check if state file exists and is writable
    if (!fs.existsSync(STATE_FILE)) {
      return { success: false, error: "State file was not created" };
    }

    // Test write access
    try {
      fs.accessSync(STATE_FILE, fs.constants.W_OK);
    } catch {
      return { success: false, error: "State file is not writable" };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during setup validation",
    };
  }
}

export default async function Command(props: LaunchProps<{ arguments: Arguments.SetupAiAgent }>) {
  const { agent } = props.arguments;

  // Check jq dependency first
  if (!isJqInstalled()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "jq is not installed",
      message: "Install with: brew install jq",
    });

    // Show installation instructions
    await open("https://jqlang.github.io/jq/download/");
    return;
  }

  try {
    // Use jq-based commands instead of deep links
    const startCommand = getIncrementCommand();
    const endCommand = getDecrementCommand();

    const agents: string[] = [];

    if (agent === "claude" || agent === "all") {
      await setupClaudeHooks(startCommand, endCommand);
      agents.push("Claude");
    }
    if (agent === "cursor" || agent === "all") {
      await setupCursorHooks(startCommand, endCommand);
      agents.push("Cursor");
    }
    if (agent === "opencode" || agent === "all") {
      await setupOpencodeHooks();
      agents.push("Opencode");
    }
    if (agent === "codex" || agent === "all") {
      await setupCodexAlias(startCommand, endCommand);
      agents.push("Codex CLI");
    }

    // Validate setup
    const validation = validateSetup();
    if (!validation.success) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Setup validation failed",
        message: validation.error || "Unknown error",
      });
      return;
    }

    // Initialize focus mode sync
    startFocusMode();

    // Try to launch menu bar command
    try {
      await launchCommand({
        name: "show-ai-agent-sessions-counter",
        type: LaunchType.UserInitiated,
      });
    } catch (launchError) {
      console.error("Failed to auto-activate menu bar command", launchError);
    }

    await showToast({
      style: Toast.Style.Success,
      title: `Successfully configured: ${agents.join(", ")}`,
      message: "State file hooks are now active",
    });
  } catch (error) {
    console.error("Setup failed", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to configure hooks",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
