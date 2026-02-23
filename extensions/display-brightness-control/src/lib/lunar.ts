import { Clipboard, open, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const LUNAR_APP_PATH = "/Applications/Lunar.app";
const USER_APPLICATIONS_LUNAR_PATH = `${homedir()}/Applications/Lunar.app`;
const LUNAR_CLI_CANDIDATE_PATHS = [`${homedir()}/.local/bin/lunar`, "/opt/homebrew/bin/lunar", "/usr/local/bin/lunar"];
const BREW_CANDIDATE_PATHS = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew"];
const LUNAR_APP_CANDIDATE_PATHS = [LUNAR_APP_PATH, USER_APPLICATIONS_LUNAR_PATH];
const LUNAR_WEBSITE_URL = "https://lunar.fyi/";
const BREW_INSTALL_LUNAR_COMMAND = "brew install --cask lunar";
const BREW_INSTALL_HOMEBREW_COMMAND =
  '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';

const DEFAULT_TIMEOUT_MS = 10_000;

export interface DisplayInfo {
  id: string;
  name: string;
  serial: string;
  brightness: number;
  transport?: string;
  main: boolean;
  active: boolean;
  adaptive: boolean;
}

export interface LunarDisplayPayload {
  id: number | string;
  name?: string;
  brightness?: number;
  transport?: unknown;
  connection?: unknown;
  connector?: unknown;
  interface?: unknown;
  main?: boolean;
  active?: boolean;
  adaptive?: boolean;
  [key: string]: unknown;
}

export interface InstallStatus {
  app: boolean;
  cli: boolean;
}

interface ExecFileErrorLike {
  message?: string;
  stderr?: string | Buffer;
  stdout?: string | Buffer;
  code?: string | number | null;
  signal?: NodeJS.Signals | null;
  killed?: boolean;
}

export interface RunLunarCommandRuntime {
  getLunarCliPathOrThrow: () => string;
  launchLunarApp: () => Promise<void>;
  runCommand: (command: string, args: string[], timeoutMs?: number) => Promise<string>;
  sleep?: (ms: number) => Promise<void>;
}

export interface SetBrightnessForDisplayOptions {
  runLunarCommand?: (args: string[], timeoutMs?: number) => Promise<string>;
  setAdaptiveMode?: (displaySerial: string, enabled: boolean) => Promise<void>;
  showToast?: typeof showToast;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type LunarErrorCode = "COMMAND_NOT_FOUND" | "TIMEOUT" | "EXEC_FAILED" | "PARSE_FAILED";

export class LunarError extends Error {
  code: LunarErrorCode;
  command: string;
  stderr?: string;
  stdout?: string;

  constructor(code: LunarErrorCode, message: string, command: string, stderr?: string, stdout?: string) {
    super(message);
    this.name = "LunarError";
    this.code = code;
    this.command = command;
    this.stderr = stderr;
    this.stdout = stdout;
  }
}

export function isLunarInstalled(): InstallStatus {
  return {
    app: Boolean(resolveLunarAppPath()),
    cli: Boolean(resolveLunarPath()),
  };
}

function resolveLunarAppPath(): string | null {
  for (const path of LUNAR_APP_CANDIDATE_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

function resolveLunarPath(): string | null {
  for (const path of LUNAR_CLI_CANDIDATE_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

function resolveBrewPath(): string | null {
  for (const path of BREW_CANDIDATE_PATHS) {
    if (existsSync(path)) {
      return path;
    }
  }

  return null;
}

function getLunarCliInstallCommand(): string {
  const appPath = resolveLunarAppPath() ?? LUNAR_APP_PATH;
  return `${appPath}/Contents/MacOS/Lunar install-cli`;
}

function buildLunarSetupCommands(status: InstallStatus): string {
  const commands: string[] = [];
  if (!status.app) {
    commands.push(BREW_INSTALL_LUNAR_COMMAND);
  }
  if (!status.cli) {
    commands.push(getLunarCliInstallCommand());
  }

  return commands.join("\n");
}

function buildLunarSetupMessage(status: InstallStatus): string {
  if (!status.app && !status.cli) {
    return "Install Lunar.app and Lunar CLI, then run Retry Setup.";
  }

  if (!status.app) {
    return "Lunar.app is missing. Install it, then run Retry Setup.";
  }

  return "Lunar CLI is missing. Install it, then run Retry Setup.";
}

export function getLunarSetupCommands(): string {
  return buildLunarSetupCommands(isLunarInstalled());
}

function isHomebrewLockError(error: unknown): boolean {
  const text = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return text.includes("already locked") || text.includes("/library/caches/homebrew/downloads");
}

export function clampBrightness(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
  }
  return false;
}

function normalizeTransport(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.toLowerCase();
  if (
    normalized.includes("usb-c") ||
    normalized.includes("usb c") ||
    normalized === "usbc" ||
    normalized.includes("type-c")
  ) {
    return "USB-C";
  }
  if (normalized.includes("thunderbolt") || normalized === "tb" || normalized.startsWith("tb ")) {
    return "Thunderbolt";
  }
  if (
    normalized.includes("displayport") ||
    normalized.includes("display port") ||
    normalized === "dp" ||
    normalized.startsWith("dp ")
  ) {
    return "DisplayPort";
  }
  if (normalized.includes("hdmi")) return "HDMI";
  if (normalized.includes("airplay")) return "AirPlay";
  if (normalized.includes("internal") || normalized.includes("built-in") || normalized.includes("builtin")) {
    return "Internal";
  }
  if (normalized.includes("virtual")) return "Virtual";
  return trimmed;
}

function pickTransport(value: unknown): string | undefined {
  const direct = normalizeTransport(value);
  if (direct) {
    return direct;
  }

  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return (
    normalizeTransport(record.transport) ??
    normalizeTransport(record.type) ??
    normalizeTransport(record.name) ??
    normalizeTransport(record.value)
  );
}

function getDisplayTransport(display: LunarDisplayPayload): string | undefined {
  return (
    pickTransport(display.transport) ??
    pickTransport(display.connection) ??
    pickTransport(display.connector) ??
    pickTransport(display.interface)
  );
}

function normalizeDisplays(payload: Record<string, LunarDisplayPayload>): DisplayInfo[] {
  return Object.entries(payload).map(([serial, display]) => ({
    id: String(display.id),
    name: display.name?.trim() || "Unknown Display",
    serial,
    brightness: clampBrightness(Number(display.brightness ?? 0)),
    transport: getDisplayTransport(display),
    main: toBoolean(display.main),
    active: toBoolean(display.active),
    adaptive: toBoolean(display.adaptive),
  }));
}

function sortDisplays(displays: DisplayInfo[]): DisplayInfo[] {
  return [...displays].sort((a, b) => {
    if (a.main && !b.main) return -1;
    if (!a.main && b.main) return 1;
    return a.name.localeCompare(b.name);
  });
}

function isGenericDisplayName(name: string | undefined): boolean {
  if (!name) return true;
  const normalized = name.trim().toLowerCase();
  return normalized === "" || normalized === "built-in" || normalized === "display";
}

function normalizeFriendlyName(name: string | undefined, isMain: boolean): string {
  const trimmed = name?.trim();
  if (!trimmed) {
    return isMain ? "Built-in Display" : "External Display";
  }

  const normalized = trimmed.toLowerCase();
  const builtInAliases = new Set(["built-in", "color lcd", "internal display", "built-in retina display"]);
  if (builtInAliases.has(normalized)) {
    return "Built-in Display";
  }

  return trimmed;
}

function parseSystemProfilerDisplayNames(stdout: string): string[] {
  try {
    const payload = JSON.parse(stdout) as {
      SPDisplaysDataType?: Array<{ spdisplays_ndrvs?: Array<{ _name?: string }> }>;
    };

    const names: string[] = [];
    for (const adapter of payload.SPDisplaysDataType ?? []) {
      for (const display of adapter.spdisplays_ndrvs ?? []) {
        const name = display._name?.trim();
        if (name) names.push(name);
      }
    }

    return names;
  } catch {
    return [];
  }
}

async function getSystemProfilerDisplayNames(): Promise<string[]> {
  try {
    const stdout = await runCommand("/usr/sbin/system_profiler", ["SPDisplaysDataType", "-json"], 15_000);
    return parseSystemProfilerDisplayNames(stdout);
  } catch {
    return [];
  }
}

async function applyFriendlyNames(displays: DisplayInfo[]): Promise<DisplayInfo[]> {
  const needsFallback = displays.some((display) => isGenericDisplayName(display.name));

  let systemNames: string[] = [];
  if (needsFallback) {
    systemNames = await getSystemProfilerDisplayNames();
  }

  const genericCount = displays.filter((d) => isGenericDisplayName(d.name)).length;
  const canMatchByPosition = systemNames.length > 0 && genericCount === 1;

  let externalIndex = 0;
  return displays.map((display) => {
    if (!isGenericDisplayName(display.name)) {
      return { ...display, name: normalizeFriendlyName(display.name, display.main) };
    }

    if (canMatchByPosition && display.main && systemNames.length > 0) {
      return { ...display, name: normalizeFriendlyName(systemNames[0], display.main) };
    }

    if (canMatchByPosition && !display.main) {
      return { ...display, name: normalizeFriendlyName(systemNames[1], display.main) };
    }

    externalIndex++;
    const fallback = display.main ? undefined : displays.length > 2 ? `External Display ${externalIndex}` : undefined;
    return { ...display, name: normalizeFriendlyName(fallback, display.main) };
  });
}

export function extractJSONObject(stdout: string): string {
  const text = stdout.trim();
  const startIndex = text.indexOf("{");
  if (startIndex < 0) {
    throw new LunarError("PARSE_FAILED", "No JSON object found in Lunar output", "lunar displays --json");
  }

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = startIndex; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }

      if (char === "\\") {
        escaping = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  throw new LunarError("PARSE_FAILED", "Incomplete JSON object in Lunar output", "lunar displays --json");
}

function parseDisplaysPayload(stdout: string): Record<string, LunarDisplayPayload> {
  const rawJSON = extractJSONObject(stdout);
  try {
    return JSON.parse(rawJSON) as Record<string, LunarDisplayPayload>;
  } catch {
    throw new LunarError("PARSE_FAILED", "Failed to parse Lunar displays JSON", "lunar displays --json");
  }
}

export function isExecTimeoutError(error: ExecFileErrorLike): boolean {
  if (error.code === "ETIMEDOUT") {
    return true;
  }

  if (error.killed && error.signal === "SIGTERM") {
    return true;
  }

  return (error.message ?? "").toLowerCase().includes("timed out");
}

async function runCommand(command: string, args: string[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      timeout: timeoutMs,
      maxBuffer: 8 * 1024 * 1024,
    });
    return stdout?.toString() ?? "";
  } catch (error) {
    const commandLabel = [command, ...args].join(" ");
    const errorWithDetails = error as ExecFileErrorLike;
    const stderr = errorWithDetails.stderr?.toString();
    const stdout = errorWithDetails.stdout?.toString();

    if (errorWithDetails.code === "ENOENT") {
      throw new LunarError("COMMAND_NOT_FOUND", `Command not found: ${command}`, commandLabel, stderr, stdout);
    }

    if (isExecTimeoutError(errorWithDetails)) {
      throw new LunarError("TIMEOUT", `Command timed out: ${commandLabel}`, commandLabel, stderr, stdout);
    }

    throw new LunarError("EXEC_FAILED", `Command failed: ${commandLabel}`, commandLabel, stderr, stdout);
  }
}

function isSocketConnectionError(error: unknown): boolean {
  if (!(error instanceof LunarError)) {
    return false;
  }

  const haystack = `${error.message}\n${error.stderr ?? ""}`;
  return haystack.includes("Socket.Socket.Error");
}

function isTransientLunarError(error: unknown): boolean {
  if (!(error instanceof LunarError)) {
    return false;
  }

  if (error.code === "TIMEOUT") {
    return true;
  }

  const haystack = `${error.message}\n${error.stderr ?? ""}\n${error.stdout ?? ""}`;
  return haystack.includes("Socket.Socket.Error") || haystack.includes("Connection refused");
}

async function launchLunarApp(): Promise<void> {
  try {
    await runCommand("/usr/bin/open", ["-a", "Lunar"], 8_000);
    return;
  } catch {
    // Fallback: try opening by bundle path directly.
  }

  const appPath = resolveLunarAppPath();
  if (!appPath) {
    return;
  }

  try {
    await runCommand("/usr/bin/open", ["-a", appPath], 8_000);
  } catch {
    // Best effort only.
  }
}

export async function runLunarCommandWithRuntime(
  args: string[],
  timeoutMs: number,
  runtime: RunLunarCommandRuntime,
): Promise<string> {
  const lunarPath = runtime.getLunarCliPathOrThrow();
  const delays = [250, 700, 1400, 2200];
  const sleepFn = runtime.sleep ?? sleep;
  let lastError: unknown;

  for (let attempt = 0; attempt < delays.length; attempt++) {
    try {
      return await runtime.runCommand(lunarPath, args, timeoutMs);
    } catch (error) {
      lastError = error;
      if (!isTransientLunarError(error)) {
        throw error;
      }

      if (attempt === 0 || isSocketConnectionError(error)) {
        await runtime.launchLunarApp();
      }

      if (attempt < delays.length - 1) {
        await sleepFn(delays[attempt]);
      }
    }
  }

  throw (
    lastError ??
    new LunarError("EXEC_FAILED", "Failed to run Lunar command after retries", `${lunarPath} ${args.join(" ")}`)
  );
}

async function runLunarCommand(args: string[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  return runLunarCommandWithRuntime(args, timeoutMs, {
    getLunarCliPathOrThrow,
    launchLunarApp,
    runCommand,
  });
}

function getErrorText(error: unknown, options?: { firstLineOnly?: boolean }): string {
  let message = "";

  if (error instanceof LunarError) {
    message = error.stderr?.trim() || error.message;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = String(error);
  }

  if (!options?.firstLineOnly) {
    return message;
  }

  return message.split("\n")[0] ?? message;
}

async function installLunarApp(): Promise<void> {
  const brewPath = resolveBrewPath();
  if (!brewPath) {
    throw new Error("Homebrew is not installed.");
  }

  const delaysMs = [1000, 2500, 5000];
  let lastError: unknown;

  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      await runCommand(brewPath, ["install", "--cask", "lunar"], 300_000);
      if (!resolveLunarAppPath()) {
        throw new Error("Lunar.app was not found after Homebrew install.");
      }
      return;
    } catch (error) {
      lastError = error;

      if (resolveLunarAppPath()) {
        return;
      }

      if (isHomebrewLockError(error) && attempt < delaysMs.length) {
        await sleep(delaysMs[attempt]);
        continue;
      }

      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function installLunarCLI(): Promise<void> {
  const appPath = resolveLunarAppPath() ?? LUNAR_APP_PATH;
  const command = `${appPath}/Contents/MacOS/Lunar`;
  const args = ["install-cli"];

  if (!existsSync(command)) {
    throw new Error(`Lunar binary not found at ${command}.`);
  }

  await runCommand(command, args, 120_000);
  if (!resolveLunarPath()) {
    throw new Error("Lunar CLI was not found after install.");
  }
}

function showSetupRequiredToast(status: InstallStatus): Promise<{ id: string }> {
  return showToast({
    style: Toast.Style.Failure,
    title: "Lunar Setup Required",
    message: buildLunarSetupMessage(status),
    primaryAction: {
      title: "Copy Setup Commands",
      onAction: () => Clipboard.copy(buildLunarSetupCommands(status)),
    },
    secondaryAction: {
      title: "Open Lunar Website",
      onAction: () => open(LUNAR_WEBSITE_URL),
    },
  });
}

export async function ensureLunarReady(): Promise<boolean> {
  const status = isLunarInstalled();
  return status.app && status.cli;
}

export async function installLunarDependencies(): Promise<boolean> {
  const initialStatus = isLunarInstalled();
  if (initialStatus.app && initialStatus.cli) {
    return true;
  }

  try {
    if (!initialStatus.app) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Installing Lunar.app",
        message: "Running Homebrew cask install",
      });
      await installLunarApp();
    }

    const statusAfterAppInstall = isLunarInstalled();
    if (!statusAfterAppInstall.cli) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Installing Lunar CLI",
        message: "Running Lunar install-cli",
      });
      await installLunarCLI();
    }

    const finalStatus = isLunarInstalled();
    if (!finalStatus.app || !finalStatus.cli) {
      await showSetupRequiredToast(finalStatus);
      return false;
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Lunar Ready",
      message: "Brightness control is set up",
    });
    return true;
  } catch (error) {
    const status = isLunarInstalled();
    await showToast({
      style: Toast.Style.Failure,
      title: "Automatic Setup Failed",
      message: getErrorText(error, { firstLineOnly: true }) || "Install Lunar manually and retry.",
      primaryAction: {
        title: "Copy Setup Commands",
        onAction: () => Clipboard.copy(buildLunarSetupCommands(status)),
      },
      secondaryAction: {
        title: resolveBrewPath() ? "Open Lunar Website" : "Copy Homebrew Install",
        onAction: () => {
          if (resolveBrewPath()) {
            open(LUNAR_WEBSITE_URL);
            return;
          }
          Clipboard.copy(BREW_INSTALL_HOMEBREW_COMMAND);
        },
      },
    });
    return false;
  }
}

function getLunarCliPathOrThrow(): string {
  const path = resolveLunarPath();
  if (!path) {
    throw new LunarError("COMMAND_NOT_FOUND", "Lunar CLI not found", "lunar");
  }
  return path;
}

export async function getDisplays(): Promise<DisplayInfo[]> {
  const delaysMs = [250, 700, 1300];
  let fallbackDisplays: DisplayInfo[] = [];
  let lastError: unknown;

  for (let attempt = 0; attempt < delaysMs.length; attempt++) {
    try {
      const stdout = await runLunarCommand(["displays", "--json"], 8_000);
      const payload = parseDisplaysPayload(stdout);

      const allDisplays = normalizeDisplays(payload);
      const namedDisplays = await applyFriendlyNames(allDisplays);
      const activeDisplays = namedDisplays.filter((display) => display.active);
      if (activeDisplays.length > 0) {
        return sortDisplays(activeDisplays);
      }

      const mainDisplays = namedDisplays.filter((display) => display.main);
      fallbackDisplays = mainDisplays.length > 0 ? sortDisplays(mainDisplays) : sortDisplays(namedDisplays);

      if (fallbackDisplays.length > 0 && attempt === delaysMs.length - 1) {
        return fallbackDisplays;
      }
    } catch (error) {
      lastError = error;
      if (fallbackDisplays.length > 0 && attempt === delaysMs.length - 1) {
        return fallbackDisplays;
      }
    }

    if (attempt < delaysMs.length - 1) {
      await sleep(delaysMs[attempt]);
    }
  }

  if (fallbackDisplays.length > 0) {
    return fallbackDisplays;
  }

  if (lastError) {
    throw lastError;
  }

  return fallbackDisplays;
}

export async function setAdaptiveMode(displaySerial: string, enabled: boolean): Promise<void> {
  await runLunarCommand(["displays", displaySerial, "adaptive", enabled ? "on" : "off"], 8_000);
}

export async function setBrightnessForDisplay(
  displaySerial: string,
  value: number,
  adaptive: boolean,
  options: SetBrightnessForDisplayOptions = {},
): Promise<void> {
  const runLunarCommandImpl = options.runLunarCommand ?? runLunarCommand;
  const setAdaptiveModeImpl =
    options.setAdaptiveMode ??
    (async (serial: string, enabled: boolean) => {
      await runLunarCommandImpl(["displays", serial, "adaptive", enabled ? "on" : "off"], 8_000);
    });
  const showToastImpl = options.showToast ?? showToast;
  const nextBrightness = clampBrightness(value);
  let adaptiveDisabled = false;

  if (adaptive) {
    try {
      await setAdaptiveModeImpl(displaySerial, false);
      adaptiveDisabled = true;
    } catch {
      // Continue even if adaptive mode cannot be disabled; setting brightness can still succeed.
    }
  }

  try {
    await runLunarCommandImpl(["displays", displaySerial, "brightness", String(nextBrightness)], 8_000);
  } finally {
    if (adaptiveDisabled) {
      try {
        await setAdaptiveModeImpl(displaySerial, true);
      } catch (error) {
        await showToastImpl({
          style: Toast.Style.Failure,
          title: "Couldn't Restore Adaptive Mode",
          message: getErrorText(error, { firstLineOnly: true }) || "Re-enable adaptive mode manually in Lunar.",
        });
      }
    }
  }
}
