import { popToRoot, closeMainWindow, showToast, Toast } from "@raycast/api";
import { spawnSync } from "child_process";
import { shellEnvSync } from "shell-env";

interface Window {
  "app-name": string;
  "window-title"?: string;
  "window-id": number;
  "monitor-name": string;
  "app-pid": string;
  workspace: string;
  "app-bundle-id": string;
  "app-path": string;
}

export interface Windows extends Array<Window> {}

let cachedEnv: Record<string, string> | null = null;

export function env() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env = shellEnvSync();

  cachedEnv = env;
  return cachedEnv;
}

async function getAppPath(bundleId: string) {
  const appPath = spawnSync("mdfind", [`kMDItemCFBundleIdentifier="${bundleId}"`], {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  return appPath.stdout.trim();
}

export async function getWindows(workspace: string) {
  const args = [
    "list-windows",
    "--json",
    ...(workspace === "focused" ? ["--workspace", "focused"] : ["--all"]),
    "--format",
    "%{app-name} %{window-title} %{window-id} %{app-pid} %{workspace} %{app-bundle-id} %{monitor-name}",
  ];

  const aerospaceArr = spawnSync("aerospace", args, {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  let windows: Windows = [];
  try {
    const parsedWindows = JSON.parse(aerospaceArr.stdout);

    windows = await Promise.all(
      parsedWindows.map(async (window: Window) => ({
        ...window,
        "app-path": await getAppPath(window["app-bundle-id"].toString()),
      })),
    );
  } catch (error) {
    console.error("Error parsing JSON:", error);
  }

  return windows;
}

export function focusWindow(windowId: string) {
  spawnSync("aerospace", ["focus", "--window-id", `${windowId}`], {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  popToRoot({ clearSearchBar: true });
  closeMainWindow({ clearRootSearch: true });
}

export async function pullWindowToCurrentWorkspace(windowId: string) {
  const focused = spawnSync("aerospace", ["list-workspaces", "--focused"], {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  const focusedWorkspace = focused.stdout.trim();

  if (!focusedWorkspace) {
    await showToast({ style: Toast.Style.Failure, title: "Could not determine focused workspace" });
    return;
  }

  const move = spawnSync("aerospace", ["move-node-to-workspace", "--window-id", windowId, focusedWorkspace], {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  if (move.status !== 0) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to move window", message: move.stderr });
    return;
  }

  spawnSync("aerospace", ["focus", "--window-id", windowId], {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  popToRoot({ clearSearchBar: true });
  closeMainWindow({ clearRootSearch: true });
}
