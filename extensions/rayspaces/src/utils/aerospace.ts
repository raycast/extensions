import { spawnSync } from "child_process";
import { shellEnvSync } from "shell-env";

let cachedEnv: Record<string, string> | undefined;

function env(): Record<string, string> {
  if (cachedEnv) return cachedEnv;
  const e = shellEnvSync();
  cachedEnv = e;
  return e;
}

export interface AerospaceWindow {
  "window-id": number;
  "window-title": string;
  "window-is-fullscreen": boolean;
  "window-layout": string;
  "window-parent-container-layout": string;
  "app-bundle-id": string;
  "app-bundle-path": string;
  "app-name": string;
  "app-pid": number;
  workspace: string;
  "workspace-is-focused": boolean;
  "workspace-is-visible": boolean;
  "workspace-root-container-layout": string;
  "monitor-id": number;
  "monitor-name": string;
}

function aerospace(args: string[]): string {
  const result = spawnSync("aerospace", args, {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  if (result.error) {
    if (result.error.message?.includes("ENOENT")) {
      throw new Error(
        "Aerospace CLI not found. Make sure the 'aerospace' binary is installed and on your PATH.",
      );
    }
    throw new Error(result.error.message);
  }

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "aerospace command failed");
  }

  return result.stdout.trim();
}

export function listWindows(): AerospaceWindow[] {
  const raw = aerospace([
    "list-windows",
    "--all",
    "--json",
    "--format",
    "%{window-id} %{window-title} %{app-name} %{app-pid} %{app-bundle-id} %{app-bundle-path} %{workspace} %{workspace-is-focused} %{workspace-is-visible} %{workspace-root-container-layout} %{window-layout} %{window-parent-container-layout} %{window-is-fullscreen} %{monitor-id} %{monitor-name}",
  ]);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AerospaceWindow[];
  } catch {
    throw new Error("Failed to parse aerospace list-windows output");
  }
}

export function focusWindow(windowId: number): void {
  aerospace(["focus", "--window-id", String(windowId)]);
}

export function focusWorkspace(name: string): void {
  aerospace(["workspace", name]);
}
