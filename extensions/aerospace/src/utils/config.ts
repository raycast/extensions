import fs from "fs/promises";
import os from "os";
import path from "path";
import { parse } from "smol-toml";
import {
  AeroSpaceError,
  aerospace,
  getCurrentMode,
  getVersionInfo,
  resolveAerospaceBin,
  validateConfig,
} from "./aerospace";

export type AppConfig = {
  mode?: Record<string, ModeConfig>;
};

export type ModeConfig = {
  binding?: Record<string, string | string[]>;
};

export type Shortcut = {
  mode: string;
  key: string;
  command: string;
  commands: string[];
  title: string;
  category: ShortcutCategory;
};

export type ShortcutCategory = "Workspace" | "Focus" | "Move" | "Layout" | "Resize" | "Mode" | "System" | "Other";

export const SHORTCUT_CATEGORY_ORDER: ShortcutCategory[] = [
  "Workspace",
  "Focus",
  "Move",
  "Layout",
  "Resize",
  "Mode",
  "System",
  "Other",
];

export type ConfigSnapshot = {
  path: string;
  binaryPath: string;
  raw: string;
  fileConfig: AppConfig | null;
  fileConfigError: Error | null;
  loadedConfig: AppConfig | null;
  loadedConfigError: Error | null;
  versionInfo: string | null;
  versionError: Error | null;
  currentMode: string | null;
  currentModeError: Error | null;
  validation: { status: "valid" | "invalid" | "unavailable"; message: string };
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

function validationStatus(error: unknown): ConfigSnapshot["validation"] {
  const message = toError(error).message;
  const unavailable = /unknown|unrecognized|unexpected.+option|unsupported|usage:\s*reload-config/i.test(message);
  return { status: unavailable ? "unavailable" : "invalid", message };
}

export function parseAppConfig(value: unknown): AppConfig {
  if (!isRecord(value)) throw new Error("Expected the AeroSpace config to be an object.");
  if (value.mode === undefined) return {};
  if (!isRecord(value.mode)) throw new Error('Expected the AeroSpace config "mode" value to be an object.');

  const modes: Record<string, ModeConfig> = {};
  for (const [modeName, modeValue] of Object.entries(value.mode)) {
    if (!isRecord(modeValue)) throw new Error(`Expected mode "${modeName}" to be an object.`);
    if (modeValue.binding === undefined) {
      modes[modeName] = {};
      continue;
    }
    if (!isRecord(modeValue.binding)) {
      throw new Error(`Expected bindings for mode "${modeName}" to be an object.`);
    }

    const bindings: Record<string, string | string[]> = {};
    for (const [key, command] of Object.entries(modeValue.binding)) {
      const validCommand =
        typeof command === "string" ||
        (Array.isArray(command) && command.every((entry): entry is string => typeof entry === "string"));
      if (!validCommand) throw new Error(`Expected binding "${modeName}.${key}" to contain command strings.`);
      bindings[key] = command;
    }
    modes[modeName] = { binding: bindings };
  }

  return { mode: modes };
}

export function parseLoadedConfigJson(output: string): AppConfig {
  try {
    return parseAppConfig(JSON.parse(output));
  } catch (error) {
    throw new AeroSpaceError(
      `Could not parse the config loaded by AeroSpace: ${toError(error).message}`,
      "invalid-response",
      { cause: error },
    );
  }
}

export async function loadLoadedConfig(): Promise<AppConfig> {
  return parseLoadedConfigJson(await aerospace("config", "--get", ".", "--json"));
}

export async function getConfigPath(): Promise<string> {
  const configPath = await aerospace("config", "--config-path");
  return configPath.startsWith("~") ? path.join(os.homedir(), configPath.slice(1)) : configPath;
}

export async function loadConfigSnapshot(): Promise<ConfigSnapshot> {
  const [configPath, binaryPath] = await Promise.all([getConfigPath(), resolveAerospaceBin()]);
  const [raw, loadedResult, versionResult, modeResult, validationResult] = await Promise.all([
    fs.readFile(configPath, "utf8"),
    loadLoadedConfig().then(
      (config) => ({ config, error: null }),
      (error: unknown) => ({ config: null, error: toError(error) }),
    ),
    getVersionInfo().then(
      (versionInfo) => ({ versionInfo, error: null }),
      (error: unknown) => ({ versionInfo: null, error: toError(error) }),
    ),
    getCurrentMode().then(
      (mode) => ({ mode, error: null }),
      (error: unknown) => ({ mode: null, error: toError(error) }),
    ),
    validateConfig().then(
      (message) => ({
        status: "valid" as const,
        message: message || "Configuration passed AeroSpace validation.",
      }),
      validationStatus,
    ),
  ]);
  const fileResult = (() => {
    try {
      return { config: parseAppConfig(parse(raw)), error: null };
    } catch (error) {
      return { config: null, error: toError(error) };
    }
  })();

  return {
    path: configPath,
    binaryPath,
    raw,
    fileConfig: fileResult.config,
    fileConfigError: fileResult.error,
    loadedConfig: loadedResult.config,
    loadedConfigError: loadedResult.error,
    versionInfo: versionResult.versionInfo,
    versionError: versionResult.error,
    currentMode: modeResult.mode,
    currentModeError: modeResult.error,
    validation: validationResult,
  };
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    return await loadLoadedConfig();
  } catch (error) {
    if (error instanceof AeroSpaceError && error.kind !== "command-failed") throw error;
    const configPath = await getConfigPath();
    return parseAppConfig(parse(await fs.readFile(configPath, "utf8")));
  }
}

// `workspace next` / `workspace prev` are relative motions rather than workspace names.
const WORKSPACE_MOTIONS = new Set(["next", "prev"]);

function parseWorkspaceName(command: string): string | null {
  if (!command.startsWith("workspace ")) return null;

  const args = command
    .slice("workspace ".length)
    .trim()
    .split(/\s+/)
    .filter((argument) => argument !== "--" && !argument.startsWith("-"));

  if (args.length !== 1) return null;
  return WORKSPACE_MOTIONS.has(args[0]) ? null : args[0];
}

export function extractWorkspaceKeys(config: AppConfig): Record<string, string> {
  const workspaceKeys: Record<string, string> = {};
  if (!config.mode) return workspaceKeys;

  for (const modeConfig of Object.values(config.mode)) {
    const bindings = modeConfig.binding;
    if (!bindings) continue;

    for (const [key, value] of Object.entries(bindings)) {
      const commands = (Array.isArray(value) ? value : [value]).flatMap(splitCommandSequence);
      for (const command of commands) {
        const name = parseWorkspaceName(command);
        if (name && !workspaceKeys[name]) workspaceKeys[name] = key;
      }
    }
  }

  return workspaceKeys;
}

export function extractShortcuts(config: AppConfig): Shortcut[] {
  const shortcuts: Shortcut[] = [];
  if (!config.mode) return shortcuts;

  for (const [mode, modeConfig] of Object.entries(config.mode)) {
    const bindings = modeConfig.binding;
    if (!bindings) continue;

    for (const [key, value] of Object.entries(bindings)) {
      if (Array.isArray(value) && value.length === 0) continue;
      const rawCommands = Array.isArray(value) ? value : [value];
      const commands = rawCommands.flatMap(splitCommandSequence);
      const command = rawCommands.join(", ");
      if (command) {
        shortcuts.push({
          mode,
          key,
          command,
          commands,
          title: commands.map(describeCommand).join(" · "),
          category: categorizeCommand(commands[0]),
        });
      }
    }
  }

  return shortcuts;
}

export function splitCommandSequence(command: string): string[] {
  const commands: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;

  for (const character of command) {
    if (escaped) {
      current += character;
      escaped = false;
    } else if (character === "\\") {
      current += character;
      escaped = true;
    } else if (quote) {
      current += character;
      if (character === quote) quote = null;
    } else if (character === "'" || character === '"') {
      current += character;
      quote = character;
    } else if (character === ";") {
      if (current.trim()) commands.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  if (current.trim()) commands.push(current.trim());
  return commands;
}

function normalizeCommandWhitespace(command: string): string {
  let normalized = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;
  let pendingSpace = false;

  for (const character of command.trim()) {
    if (escaped) {
      normalized += character;
      escaped = false;
    } else if (character === "\\") {
      if (pendingSpace && normalized) normalized += " ";
      pendingSpace = false;
      normalized += character;
      escaped = true;
    } else if (quote) {
      normalized += character;
      if (character === quote) quote = null;
    } else if (character === "'" || character === '"') {
      if (pendingSpace && normalized) normalized += " ";
      pendingSpace = false;
      normalized += character;
      quote = character;
    } else if (/\s/.test(character)) {
      pendingSpace = true;
    } else {
      if (pendingSpace && normalized) normalized += " ";
      pendingSpace = false;
      normalized += character;
    }
  }

  return normalized;
}

function commandParts(command: string): string[] {
  const parts: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaped = false;

  for (const character of command.trim()) {
    if (escaped) {
      current += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (quote) {
      if (character === quote) quote = null;
      else current += character;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (/\s/.test(character)) {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += character;
    }
  }

  if (escaped) current += "\\";
  if (current) parts.push(current);
  return parts;
}

function commandArguments(command: string): string[] {
  return commandParts(command)
    .slice(1)
    .filter((part) => part !== "--" && !part.startsWith("--"));
}

function titleCase(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const SCRIPT_INTERPRETERS = new Set([
  "bash",
  "dash",
  "fish",
  "ksh",
  "node",
  "osascript",
  "python",
  "python2",
  "python3",
  "ruby",
  "sh",
  "zsh",
]);

const SCRIPT_EXTENSIONS = /\.(?:bash|command|fish|js|mjs|cjs|py|rb|scpt|sh|ts|zsh)$/i;
const SHELL_OPERATORS = new Set(["|", "||", "&&", ">", ">>", "<", "<<", ";", "&"]);

function commandName(value: string): string {
  return titleCase(path.basename(value).replace(SCRIPT_EXTENSIONS, ""));
}

function isDisplayArgument(value: string): boolean {
  return (
    value !== "--" &&
    !value.startsWith("-") &&
    !SHELL_OPERATORS.has(value) &&
    !/^\d*(?:>>?|<<?|>&)/.test(value) &&
    !/^[A-Za-z_][A-Za-z0-9_]*=/.test(value)
  );
}

function describeExecAndForget(parts: string[]): string {
  let command = parts;

  if (path.basename(command[0] ?? "") === "env") {
    command = command.slice(1).filter((part) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(part));
  }

  const interpreter = path.basename(command[0] ?? "");
  if (SCRIPT_INTERPRETERS.has(interpreter)) {
    const interpreterArguments = command.slice(1);
    if (interpreterArguments.some((part) => /^-[^-]*c/.test(part))) return "Shell Command";
    const scriptIndex = interpreterArguments.findIndex((part) => !part.startsWith("-") && part !== "--");
    command = scriptIndex >= 0 ? interpreterArguments.slice(scriptIndex) : [];
  }

  const [executable, ...args] = command;
  if (!executable) return "Custom Command";

  return [commandName(executable), ...args.filter(isDisplayArgument)].filter(Boolean).join(" ");
}

export function categorizeCommand(command: string): ShortcutCategory {
  const name = commandParts(command)[0] ?? "";
  if (["workspace", "workspace-back-and-forth", "summon-workspace"].includes(name)) return "Workspace";
  if (["focus", "focus-monitor", "focus-back-and-forth"].includes(name)) return "Focus";
  if (["move", "move-node-to-monitor", "move-node-to-workspace", "move-workspace-to-monitor", "swap"].includes(name)) {
    return "Move";
  }
  if (["layout", "split", "join-with", "fullscreen", "macos-native-fullscreen"].includes(name)) return "Layout";
  if (["resize", "balance-sizes", "flatten-workspace-tree"].includes(name)) return "Resize";
  if (name === "mode") return "Mode";
  if (
    [
      "reload-config",
      "enable",
      "exec-and-forget",
      "volume",
      "close",
      "close-all-windows-but-current",
      "macos-native-minimize",
    ].includes(name)
  ) {
    return "System";
  }
  return "Other";
}

export function describeCommand(command: string): string {
  const [name = "", ...parts] = commandParts(command);
  const args = commandArguments(command);
  const target = args.join(" ");
  const direction = target ? titleCase(target) : "";

  switch (name) {
    case "workspace":
      return target === "next" || target === "prev"
        ? `${titleCase(target)} Workspace`
        : `Switch to Workspace ${target || "…"}`;
    case "workspace-back-and-forth":
      return "Previous Workspace";
    case "summon-workspace":
      return `Summon Workspace ${target || "…"}`;
    case "focus":
      return `Focus ${direction || "Window"}`;
    case "focus-monitor":
      return `Focus ${direction || "Next"} Monitor`;
    case "focus-back-and-forth":
      return "Focus Previous Window";
    case "move":
      return `Move Window ${direction}`.trim();
    case "move-node-to-workspace":
      return `Move Window to Workspace ${target || "…"}`;
    case "move-node-to-monitor":
      return `Move Window to ${direction || "Another"} Monitor`;
    case "move-workspace-to-monitor":
      return `Move Workspace to ${direction || "Another"} Monitor`;
    case "swap":
      return `Swap Window ${direction}`.trim();
    case "layout":
      return `Set Layout: ${direction || "Default"}`;
    case "split":
      return `Split ${direction}`.trim();
    case "join-with":
      return `Join Window ${direction}`.trim();
    case "fullscreen":
      return `${parts[0] === "on" ? "Enable" : parts[0] === "off" ? "Disable" : "Toggle"} Fullscreen`;
    case "macos-native-fullscreen":
      return "Toggle macOS Fullscreen";
    case "resize":
      return `Resize ${direction}`.trim();
    case "balance-sizes":
      return "Balance Window Sizes";
    case "flatten-workspace-tree":
      return "Flatten Workspace Layout";
    case "mode":
      return `Enter ${titleCase(target || "Binding")} Mode`;
    case "reload-config":
      return "Reload AeroSpace Config";
    case "enable":
      return `${titleCase(target || "Toggle")} AeroSpace`;
    case "close":
      return "Close Window";
    case "close-all-windows-but-current":
      return "Close Other Windows";
    case "macos-native-minimize":
      return "Minimize Window";
    case "volume":
      return `Volume ${direction}`.trim();
    case "exec-and-forget":
      return describeExecAndForget(parts);
    default:
      return [titleCase(name || "Command"), target].filter(Boolean).join(": ");
  }
}

export function visibleShortcuts(shortcuts: Shortcut[], showFullBindings: boolean): Shortcut[] {
  if (showFullBindings) return shortcuts;
  const mainMode = shortcuts.filter((shortcut) => shortcut.mode === "main");
  if (mainMode.length > 0) return mainMode;
  const firstMode = shortcuts[0]?.mode;
  return firstMode ? shortcuts.filter((shortcut) => shortcut.mode === firstMode) : [];
}

export function bindingsMatch(fileConfig: AppConfig | null, loadedConfig: AppConfig | null): boolean | null {
  if (!fileConfig || !loadedConfig) return null;
  const comparable = (config: AppConfig) =>
    extractShortcuts(config)
      .map((shortcut) => ({
        mode: shortcut.mode,
        key: shortcut.key,
        commands: shortcut.commands.map(normalizeCommandWhitespace).filter(Boolean),
      }))
      .sort((left, right) => `${left.mode}.${left.key}`.localeCompare(`${right.mode}.${right.key}`));
  return JSON.stringify(comparable(fileConfig)) === JSON.stringify(comparable(loadedConfig));
}
