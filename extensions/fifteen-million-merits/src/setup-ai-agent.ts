import { type LaunchProps, LaunchType, launchCommand, showToast, Toast } from "@raycast/api";
import * as fs from "fs";
import { homedir } from "os";
import * as path from "path";
import { syncFocusMode, updateCounter } from "./lib/storage";
import type { ClaudeSettings, CursorHooks, OpencodeConfig } from "./types";

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
  } else if (!settings.hooks.SessionStart[startIdx].hooks.some((h) => h.command.includes("increment-counter"))) {
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
  } else if (!settings.hooks.SessionEnd[endIdx].hooks.some((h) => h.command.includes("decrement-counter"))) {
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
  if (!config.hooks.beforeSubmitPrompt.some((h) => h.command.includes("increment-counter"))) {
    config.hooks.beforeSubmitPrompt.push({ command: startCommand });
  }

  if (!config.hooks.stop) config.hooks.stop = [];
  if (!config.hooks.stop.some((h) => h.command.includes("decrement-counter"))) {
    config.hooks.stop.push({ command: endCommand });
  }

  writeJsonFile(hooksPath, config);
}

async function setupOpencodeHooks(startCommand: string, endCommand: string) {
  const configDir = path.join(homedir(), ".config", "opencode");
  const pluginDir = path.join(configDir, "plugin");
  const configPath = path.join(configDir, "opencode.json");

  const pluginContent = `
import type { Plugin } from "@opencode-ai/plugin";

export const RaycastTracker: Plugin = async ({ $ }) => {
  return {
    event: async ({ event }) => {
      if (event.type === "session.created") {
        await $\`${startCommand}\`;
      }
      if (event.type === "session.idle") {
        await $\`${endCommand}\`;
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
  const aliasLine = `\n# Raycast Codex Tracker\nalias codex='${startCommand} && command codex "$@"; ${endCommand}'\n`;

  const targetFiles = [zshrcPath, bashrcPath];

  for (const filePath of targetFiles) {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, "utf-8");
      if (!content.includes("alias codex=")) {
        content += aliasLine;
        fs.writeFileSync(filePath, content);
      }
    }
  }
}

export default async function Command(props: LaunchProps<Arguments.SetupAiAgent>) {
  const { agent } = props.arguments;

  try {
    const startCommand = "open -g raycast://extensions/alexi.build/fifteen-million-merits/increment-counter";
    const endCommand = "open -g raycast://extensions/alexi.build/fifteen-million-merits/decrement-counter";

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
      await setupOpencodeHooks(startCommand, endCommand);
      agents.push("Opencode");
    }
    if (agent === "codex" || agent === "all") {
      await setupCodexAlias(startCommand, endCommand);
      agents.push("Codex CLI");
    }

    const { currentCount, newCount } = await updateCounter(0);
    await syncFocusMode(currentCount, newCount);

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
