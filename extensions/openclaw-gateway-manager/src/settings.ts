import { homedir } from "node:os";
import { delimiter, isAbsolute, join } from "node:path";

export interface SettingsInput {
  binPath?: string;
  logPath?: string;
  stateDirectory?: string;
  configPath?: string;
  additionalPath?: string;
  dailyLogDirectory?: string;
  commandTimeoutSeconds?: string;
  commandOutputMiB?: string;
  logEntryLimit?: string;
  logReadKiB?: string;
  defaultLogLevel?: string;
  groupRepeatedLogs?: boolean;
}

export interface OpenClawSettings {
  binPath: string;
  logPath: string;
  stateDirectory: string;
  stateDirectoryOverride?: string;
  configPathOverride?: string;
  additionalPaths: string[];
  dailyLogDirectory: string;
  commandTimeoutMs: number;
  commandOutputBytes: number;
  logEntryLimit: number;
  logReadBytes: number;
  defaultLogLevel: string;
  groupRepeatedLogs: boolean;
  isolatedLogs: boolean;
}

export function normalizeSettings(
  input: SettingsInput = {},
  env: NodeJS.ProcessEnv = process.env,
  home = homedir(),
): OpenClawSettings {
  const automatic = (value?: string) =>
    !value?.trim() || value.trim().toLowerCase() === "auto";
  const expand = (value: string, label: string) => {
    const path = value.trim().replace(/^~(?=\/|$)/, home);
    if (!isAbsolute(path))
      throw new Error(`${label} must be an absolute path, a ~/ path, or auto.`);
    return path;
  };
  const pathOption = (value: string | undefined, label: string) =>
    automatic(value) ? undefined : expand(value!, label);
  const integer = (
    value: string | undefined,
    fallback: number,
    min: number,
    max: number,
    label: string,
  ) => {
    const parsed = Number(value?.trim() || fallback);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max)
      throw new Error(
        `${label} must be an integer from ${min} to ${max}. Check extension preferences.`,
      );
    return parsed;
  };
  const stateDirectoryOverride = pathOption(
    input.stateDirectory,
    "State Directory",
  );
  const configPathOverride = pathOption(input.configPath, "Config File Path");
  const stateDirectory =
    stateDirectoryOverride ??
    (env.OPENCLAW_STATE_DIR
      ? expand(env.OPENCLAW_STATE_DIR, "OPENCLAW_STATE_DIR")
      : join(
          env.OPENCLAW_HOME ? expand(env.OPENCLAW_HOME, "OPENCLAW_HOME") : home,
          ".openclaw",
        ));
  const defaultLogLevel = input.defaultLogLevel?.trim() || "all";
  if (
    !["all", "problems", "error", "warn", "info", "debug"].includes(
      defaultLogLevel,
    )
  )
    throw new Error("Invalid Default Log Level. Check extension preferences.");
  return {
    binPath: pathOption(input.binPath, "OpenClaw Binary Path") ?? "",
    logPath: pathOption(input.logPath, "Log File Path") ?? "",
    stateDirectory,
    stateDirectoryOverride,
    configPathOverride,
    additionalPaths: (input.additionalPath ?? "")
      .split(new RegExp(`[${delimiter}\\n]`))
      .map((value) => value.trim())
      .filter(Boolean)
      .map((path) => expand(path, "Additional Executable Paths")),
    dailyLogDirectory: expand(
      input.dailyLogDirectory?.trim() || "/tmp/openclaw",
      "Diagnostic Log Directory",
    ),
    commandTimeoutMs:
      integer(input.commandTimeoutSeconds, 20, 1, 300, "Command Timeout") *
      1000,
    commandOutputBytes:
      integer(input.commandOutputMiB, 2, 1, 16, "CLI Output Limit") *
      1024 *
      1024,
    logEntryLimit: integer(input.logEntryLimit, 80, 1, 1000, "Log Entry Limit"),
    logReadBytes:
      integer(input.logReadKiB, 256, 16, 4096, "Log Read Window") * 1024,
    defaultLogLevel,
    groupRepeatedLogs: input.groupRepeatedLogs ?? true,
    isolatedLogs:
      stateDirectory !== join(home, ".openclaw") ||
      Boolean(
        configPathOverride || env.OPENCLAW_CONFIG_PATH || env.OPENCLAW_PROFILE,
      ),
  };
}

export function settingsEnvironment(
  settings: OpenClawSettings,
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return {
    ...env,
    ...(settings.stateDirectoryOverride
      ? { OPENCLAW_STATE_DIR: settings.stateDirectoryOverride }
      : {}),
    ...(settings.configPathOverride
      ? { OPENCLAW_CONFIG_PATH: settings.configPathOverride }
      : {}),
    PATH: [...settings.additionalPaths, env.PATH ?? ""]
      .filter(Boolean)
      .join(delimiter),
  };
}
