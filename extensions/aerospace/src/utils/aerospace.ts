import { getApplications, getPreferenceValues, open, openExtensionPreferences, Toast } from "@raycast/api";
import { execFile, spawn } from "child_process";
import { constants } from "fs";
import { access } from "fs/promises";
import os from "os";
import path from "path";
import { createInterface } from "readline";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const AEROSPACE_BUNDLE_ID = "bobko.aerospace";
const COMMAND_TIMEOUT_MS = 15_000;
const NAME_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const SEARCH_PATHS = [
  "/opt/homebrew/bin/aerospace",
  "/usr/local/bin/aerospace",
  "/run/current-system/sw/bin/aerospace",
  path.join(os.homedir(), ".nix-profile/bin/aerospace"),
];

export type AeroSpaceErrorKind = "binary-unavailable" | "server-unavailable" | "invalid-response" | "command-failed";

export class AeroSpaceError extends Error {
  constructor(
    message: string,
    readonly kind: AeroSpaceErrorKind,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AeroSpaceError";
  }
}

export type WindowSnapshot = {
  appName: string;
  appBundleId: string;
  appBundlePath: string;
  title: string;
  id: number;
  workspace: string;
  monitorName: string;
  workspaceIsFocused: boolean;
  workspaceIsVisible: boolean;
  layout: string;
  isFullscreen: boolean;
};

export type WorkspaceSnapshot = {
  name: string;
  isFocused: boolean;
  isVisible: boolean;
  monitorName?: string;
  rootLayout: string;
};

export type MonitorSnapshot = {
  name: string;
  isMain: boolean;
};

export type WindowScope = "focused" | "visible" | "all";
export type TilingLayout = "h_tiles" | "v_tiles" | "h_accordion" | "v_accordion";

export type AeroSpaceEvent =
  | { type: "focus-changed"; workspace: string; windowId?: number }
  | { type: "focused-monitor-changed"; workspace: string; monitorId: number }
  | { type: "focused-workspace-changed"; workspace: string; previousWorkspace?: string }
  | { type: "mode-changed"; mode: string };

export type WorkspaceApp = {
  name: string;
  bundleId: string;
  bundlePath: string;
};

export type WorkspaceCatalogItem = WorkspaceSnapshot & {
  apps: WorkspaceApp[];
  binding?: string;
};

type UnknownRecord = Record<string, unknown>;

let resolvedBinary: string | null = null;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: UnknownRecord, key: string): string {
  const value = record[key];
  if (typeof value !== "string") throw invalidResponse(`Expected "${key}" to be a string`);
  return value;
}

function readNumber(record: UnknownRecord, key: string): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw invalidResponse(`Expected "${key}" to be a number`);
  }
  return value;
}

function readBoolean(record: UnknownRecord, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") throw invalidResponse(`Expected "${key}" to be a boolean`);
  return value;
}

function readOptionalString(record: UnknownRecord, key: string, fallback = ""): string {
  return record[key] === undefined ? fallback : readString(record, key);
}

function readOptionalBoolean(record: UnknownRecord, key: string, fallback = false): boolean {
  return record[key] === undefined ? fallback : readBoolean(record, key);
}

function invalidResponse(detail: string, cause?: unknown): AeroSpaceError {
  return new AeroSpaceError(`AeroSpace returned an unexpected response. ${detail}.`, "invalid-response", { cause });
}

function parseJsonArray(output: string): unknown[] {
  try {
    const value: unknown = JSON.parse(output);
    if (!Array.isArray(value)) throw invalidResponse("Expected a JSON array");
    return value;
  } catch (error) {
    if (error instanceof AeroSpaceError) throw error;
    throw invalidResponse("Could not parse JSON", error);
  }
}

export function parseWindowSnapshots(output: string): WindowSnapshot[] {
  return parseJsonArray(output).map((value) => {
    if (!isRecord(value)) throw invalidResponse("Expected every window to be an object");
    return {
      appName: readString(value, "app-name"),
      appBundleId: readString(value, "app-bundle-id"),
      appBundlePath: readString(value, "app-bundle-path"),
      title: readString(value, "window-title"),
      id: readNumber(value, "window-id"),
      workspace: readString(value, "workspace"),
      monitorName: readString(value, "monitor-name"),
      workspaceIsFocused: readBoolean(value, "workspace-is-focused"),
      workspaceIsVisible: readOptionalBoolean(
        value,
        "workspace-is-visible",
        readBoolean(value, "workspace-is-focused"),
      ),
      layout: readOptionalString(value, "window-layout"),
      isFullscreen: readOptionalBoolean(value, "window-is-fullscreen"),
    };
  });
}

export function parseWorkspaceSnapshots(output: string): WorkspaceSnapshot[] {
  return parseJsonArray(output).map((value) => {
    if (!isRecord(value)) throw invalidResponse("Expected every workspace to be an object");
    return {
      name: readString(value, "workspace"),
      isFocused: readBoolean(value, "workspace-is-focused"),
      isVisible: readBoolean(value, "workspace-is-visible"),
      monitorName: readString(value, "monitor-name") || undefined,
      rootLayout: readOptionalString(value, "workspace-root-container-layout"),
    };
  });
}

export function parseMonitorSnapshots(output: string): MonitorSnapshot[] {
  return parseJsonArray(output).map((value) => {
    if (!isRecord(value)) throw invalidResponse("Expected every monitor to be an object");
    return {
      name: readString(value, "monitor-name"),
      isMain: readBoolean(value, "monitor-is-main"),
    };
  });
}

export function buildWorkspaceCatalog(
  workspaces: WorkspaceSnapshot[],
  windows: WindowSnapshot[],
  bindings: Record<string, string> = {},
): WorkspaceCatalogItem[] {
  const catalog = new Map<string, WorkspaceCatalogItem>();

  for (const workspace of workspaces) {
    catalog.set(workspace.name, { ...workspace, apps: [], binding: bindings[workspace.name] });
  }

  for (const name of Object.keys(bindings)) {
    if (!catalog.has(name)) {
      catalog.set(name, {
        name,
        isFocused: false,
        isVisible: false,
        rootLayout: "",
        apps: [],
        binding: bindings[name],
      });
    }
  }

  for (const window of windows) {
    const workspace = catalog.get(window.workspace) ?? {
      name: window.workspace,
      isFocused: window.workspaceIsFocused,
      isVisible: window.workspaceIsVisible,
      monitorName: window.monitorName,
      rootLayout: "",
      apps: [],
      binding: bindings[window.workspace],
    };
    const appIdentity = window.appBundleId || window.appBundlePath || window.appName;
    const alreadyIncluded = workspace.apps.some((app) => (app.bundleId || app.bundlePath || app.name) === appIdentity);
    if (!alreadyIncluded) {
      workspace.apps.push({
        name: window.appName,
        bundleId: window.appBundleId,
        bundlePath: window.appBundlePath,
      });
    }
    catalog.set(window.workspace, workspace);
  }

  return [...catalog.values()]
    .map((workspace) => ({
      ...workspace,
      apps: workspace.apps.sort((left, right) => NAME_COLLATOR.compare(left.name, right.name)),
    }))
    .sort((left, right) => {
      const statusOrder = (workspace: WorkspaceCatalogItem) =>
        workspace.isFocused ? 0 : workspace.isVisible ? 1 : workspace.apps.length > 0 ? 2 : 3;
      return statusOrder(left) - statusOrder(right) || NAME_COLLATOR.compare(left.name, right.name);
    });
}

export async function resolveAerospaceBin(): Promise<string> {
  if (resolvedBinary) return resolvedBinary;

  const { aerospaceBin } = getPreferenceValues<Preferences>();
  if (aerospaceBin?.trim()) {
    const configuredPath = aerospaceBin.trim();
    await access(configuredPath, constants.X_OK).catch(() => {
      throw new AeroSpaceError(
        `The AeroSpace binary is not executable at ${configuredPath}. Check the extension preferences.`,
        "binary-unavailable",
      );
    });
    resolvedBinary = configuredPath;
    return configuredPath;
  }

  const results = await Promise.all(
    SEARCH_PATHS.map((candidate) =>
      access(candidate, constants.X_OK).then(
        () => candidate,
        () => null,
      ),
    ),
  );
  const found = results.find((candidate): candidate is string => candidate !== null);
  if (found) {
    resolvedBinary = found;
    return found;
  }

  throw new AeroSpaceError(
    "Could not find the AeroSpace binary. Set its path in the extension preferences.",
    "binary-unavailable",
  );
}

export function failureToastOptions(title: string) {
  return {
    title,
    primaryAction: {
      title: "Open Extension Preferences",
      onAction: async (toast: Toast) => {
        await toast.hide();
        await openExtensionPreferences();
      },
    },
  };
}

function formatAeroSpaceError(error: unknown): AeroSpaceError {
  if (error instanceof AeroSpaceError) return error;
  if (!(error instanceof Error)) {
    return new AeroSpaceError(String(error), "command-failed");
  }

  const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr.trim() : "";
  const detail = [error.message, stderr].join("\n").toLowerCase();

  if (
    detail.includes("can't connect to aerospace server") ||
    detail.includes("connection refused") ||
    detail.includes("econnrefused")
  ) {
    return new AeroSpaceError("Can't connect to AeroSpace. Make sure AeroSpace is running.", "server-unavailable", {
      cause: error,
    });
  }

  if ("code" in error && error.code === "ENOENT") {
    return new AeroSpaceError(
      "Could not find the AeroSpace binary. Set its path in the extension preferences.",
      "binary-unavailable",
      { cause: error },
    );
  }

  return new AeroSpaceError(stderr.split("\n")[0] || error.message, "command-failed", { cause: error });
}

export async function aerospace(...args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(await resolveAerospaceBin(), args, {
      encoding: "utf8",
      timeout: COMMAND_TIMEOUT_MS,
    });
    return stdout.trim();
  } catch (error) {
    throw formatAeroSpaceError(error);
  }
}

export async function openAeroSpaceApplication(): Promise<void> {
  const applications = await getApplications();
  const application = applications.find((candidate) => candidate.bundleId === AEROSPACE_BUNDLE_ID);
  if (!application) {
    throw new AeroSpaceError(
      "Could not find AeroSpace.app. Install it or configure the CLI path in extension preferences.",
      "binary-unavailable",
    );
  }
  await open(application.path);
}

export async function listWindows(scope: WindowScope): Promise<WindowSnapshot[]> {
  const selector = scope === "all" ? ["--all"] : ["--workspace", scope];
  const baseFormat = [
    "%{app-name}",
    "%{window-title}",
    "%{window-id}",
    "%{workspace}",
    "%{app-bundle-id}",
    "%{app-bundle-path}",
    "%{monitor-name}",
    "%{workspace-is-focused}",
  ];
  const query = (format: string[]) => aerospace("list-windows", ...selector, "--json", "--format", format.join(" "));
  const output = await query([
    ...baseFormat,
    "%{workspace-is-visible}",
    "%{window-layout}",
    "%{window-is-fullscreen}",
  ]).catch((error: unknown) => {
    if (error instanceof AeroSpaceError && error.kind === "command-failed") return query(baseFormat);
    throw error;
  });
  return parseWindowSnapshots(output).sort(
    (left, right) =>
      Number(right.workspaceIsFocused) - Number(left.workspaceIsFocused) ||
      Number(right.workspaceIsVisible) - Number(left.workspaceIsVisible) ||
      NAME_COLLATOR.compare(left.workspace, right.workspace) ||
      NAME_COLLATOR.compare(left.title || left.appName, right.title || right.appName),
  );
}

export async function listWorkspaces(): Promise<WorkspaceSnapshot[]> {
  const baseFormat = ["%{workspace}", "%{workspace-is-focused}", "%{workspace-is-visible}", "%{monitor-name}"];
  const query = (format: string[]) => aerospace("list-workspaces", "--all", "--json", "--format", format.join(" "));
  const output = await query([...baseFormat, "%{workspace-root-container-layout}"]).catch((error: unknown) => {
    if (error instanceof AeroSpaceError && error.kind === "command-failed") return query(baseFormat);
    throw error;
  });
  return parseWorkspaceSnapshots(output);
}

export async function listMonitors(): Promise<MonitorSnapshot[]> {
  const output = await aerospace(
    "list-monitors",
    "--json",
    "--format",
    ["%{monitor-name}", "%{monitor-is-main}"].join(" "),
  );
  return parseMonitorSnapshots(output).sort(
    (left, right) => Number(right.isMain) - Number(left.isMain) || NAME_COLLATOR.compare(left.name, right.name),
  );
}

export async function getFocusedWorkspace(): Promise<string> {
  return aerospace("list-workspaces", "--focused");
}

export async function focusWorkspace(name: string): Promise<void> {
  await aerospace("workspace", "--", name);
}

export async function focusWindow(windowId: number): Promise<void> {
  await aerospace("focus", "--window-id", String(windowId));
}

export async function pullWindowToFocusedWorkspace(windowId: number): Promise<void> {
  const workspace = await getFocusedWorkspace();
  await aerospace("move-node-to-workspace", "--focus-follows-window", "--window-id", String(windowId), "--", workspace);
}

export async function moveWindowToWorkspace(windowId: number, workspace: string): Promise<void> {
  await aerospace("move-node-to-workspace", "--window-id", String(windowId), "--", workspace);
}

export async function moveWindowToMonitor(windowId: number, monitor: string): Promise<void> {
  await aerospace("move-node-to-monitor", "--window-id", String(windowId), "--", monitor);
}

export async function setWindowLayout(windowId: number, layout: "floating" | "tiling"): Promise<void> {
  await aerospace("layout", "--window-id", String(windowId), layout);
}

export async function toggleWindowFullscreen(windowId: number): Promise<void> {
  await aerospace("fullscreen", "--window-id", String(windowId));
}

export async function summonWorkspace(name: string): Promise<void> {
  await aerospace("summon-workspace", "--", name);
}

export async function balanceWorkspace(name?: string): Promise<void> {
  await aerospace("balance-sizes", ...(name ? ["--workspace", name] : []));
}

export async function setWorkspaceRootLayout(name: string, layout: TilingLayout): Promise<void> {
  await aerospace("layout", "--workspace", name, "--root", layout);
}

export async function workspaceBackAndForth(): Promise<void> {
  await aerospace("workspace-back-and-forth");
}

export async function toggleAeroSpaceEnabled(): Promise<void> {
  await aerospace("enable", "toggle");
}

export async function getCurrentMode(): Promise<string> {
  return aerospace("list-modes", "--current");
}

export async function getVersionInfo(): Promise<string> {
  return aerospace("--version");
}

export async function validateConfig(): Promise<string> {
  return aerospace("reload-config", "--dry-run", "--warnings-as-errors");
}

export async function reloadConfig(): Promise<void> {
  await validateConfig();
  await aerospace("reload-config");
}

export async function triggerBinding(mode: string, binding: string): Promise<void> {
  await aerospace("trigger-binding", "--mode", mode, "--", binding);
}

function parseAeroSpaceEvent(line: string): AeroSpaceEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value._event !== "string") return null;

  if (value._event === "mode-changed" && typeof value.mode === "string") {
    return { type: "mode-changed", mode: value.mode };
  }
  if (value._event === "focused-workspace-changed" && typeof value.workspace === "string") {
    return {
      type: "focused-workspace-changed",
      workspace: value.workspace,
      previousWorkspace: typeof value.prevWorkspace === "string" ? value.prevWorkspace : undefined,
    };
  }
  if (
    value._event === "focused-monitor-changed" &&
    typeof value.workspace === "string" &&
    typeof value.monitorId === "number"
  ) {
    return { type: "focused-monitor-changed", workspace: value.workspace, monitorId: value.monitorId };
  }
  if (value._event === "focus-changed" && typeof value.workspace === "string") {
    return {
      type: "focus-changed",
      workspace: value.workspace,
      windowId: typeof value.windowId === "number" ? value.windowId : undefined,
    };
  }
  return null;
}

export async function subscribeToAeroSpaceEvents(
  onEvent: (event: AeroSpaceEvent) => void,
  onError: (error: AeroSpaceError) => void,
): Promise<() => void> {
  const child = spawn(
    await resolveAerospaceBin(),
    ["subscribe", "focus-changed", "focused-monitor-changed", "focused-workspace-changed", "mode-changed"],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  const output = createInterface({ input: child.stdout });
  let stopped = false;
  let stderr = "";

  output.on("line", (line) => {
    const event = parseAeroSpaceEvent(line);
    if (event) onEvent(event);
  });
  child.stderr.on("data", (chunk: Buffer | string) => {
    stderr += chunk.toString();
  });
  child.on("error", (error) => {
    if (!stopped) onError(formatAeroSpaceError(error));
  });
  child.on("close", (code) => {
    if (!stopped && code !== 0) {
      onError(new AeroSpaceError(stderr.trim() || "The AeroSpace event stream stopped.", "command-failed"));
    }
  });

  return () => {
    stopped = true;
    output.close();
    child.kill();
  };
}
