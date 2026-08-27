import { getApplications, getPreferenceValues, open, openExtensionPreferences, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { constants } from "fs";
import { access } from "fs/promises";
import os from "os";
import path from "path";
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
};

export type WorkspaceSnapshot = {
  name: string;
  isFocused: boolean;
  isVisible: boolean;
  monitorName?: string;
};

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
        apps: [],
        binding: bindings[name],
      });
    }
  }

  for (const window of windows) {
    const workspace = catalog.get(window.workspace) ?? {
      name: window.workspace,
      isFocused: window.workspaceIsFocused,
      isVisible: window.workspaceIsFocused,
      monitorName: window.monitorName,
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
    .sort(
      (left, right) => Number(right.isFocused) - Number(left.isFocused) || NAME_COLLATOR.compare(left.name, right.name),
    );
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

export async function listWindows(scope: "focused" | "all"): Promise<WindowSnapshot[]> {
  const selector = scope === "focused" ? ["--workspace", "focused"] : ["--all"];
  const output = await aerospace(
    "list-windows",
    ...selector,
    "--json",
    "--format",
    [
      "%{app-name}",
      "%{window-title}",
      "%{window-id}",
      "%{workspace}",
      "%{app-bundle-id}",
      "%{app-bundle-path}",
      "%{monitor-name}",
      "%{workspace-is-focused}",
    ].join(" "),
  );
  return parseWindowSnapshots(output).sort(
    (left, right) =>
      Number(right.workspaceIsFocused) - Number(left.workspaceIsFocused) ||
      NAME_COLLATOR.compare(left.workspace, right.workspace) ||
      NAME_COLLATOR.compare(left.appName, right.appName),
  );
}

export async function listWorkspaces(): Promise<WorkspaceSnapshot[]> {
  const output = await aerospace(
    "list-workspaces",
    "--all",
    "--json",
    "--format",
    ["%{workspace}", "%{workspace-is-focused}", "%{workspace-is-visible}", "%{monitor-name}"].join(" "),
  );
  return parseWorkspaceSnapshots(output);
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

export async function setWindowTiling(windowId: number): Promise<void> {
  await aerospace("layout", "--window-id", String(windowId), "tiling");
}

export async function triggerBinding(mode: string, binding: string): Promise<void> {
  await aerospace("trigger-binding", "--mode", mode, "--", binding);
}
