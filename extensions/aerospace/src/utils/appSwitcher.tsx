import { popToRoot } from "@raycast/api";
import { spawnSync } from "child_process";
import { shellEnv } from "shell-env";

interface Window {
  "app-name": string;
  "window-title"?: string;
  "window-id": number;
  "app-pid": string;
  workspace: string;
  "app-bundle-id": string;
  "app-path": string;
}

export interface Windows extends Array<Window> {}

let cachedEnv: Record<string, string> | null = null;

export async function env() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env = await shellEnv();

  cachedEnv = env;
  return cachedEnv;
}

async function getAppPath(bundleId: string) {
  const appPath = spawnSync("mdfind", [`kMDItemCFBundleIdentifier="${bundleId}"`], {
    env: await env(),
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
    "%{app-name} %{window-title} %{window-id} %{app-pid} %{workspace} %{app-bundle-id}",
  ];

  const aerospaceArr = spawnSync("aerospace", args, {
    env: await env(),
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

export async function focusWindow(windowId: string) {
  spawnSync("aerospace", ["focus", "--window-id", `${windowId}`], {
    env: await env(),
    encoding: "utf8",
    timeout: 15000,
  });

  popToRoot({ clearSearchBar: true });
}
