import { popToRoot } from "@raycast/api";
import { spawnSync } from "child_process";

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

export function env() {
  return { PATH: "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:" };
}

function getAppPath(bundleId: string) {
  const appPath = spawnSync("mdfind", [`kMDItemCFBundleIdentifier="${bundleId}"`], {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  return appPath.stdout.trim();
}

export function getWindows(workspace: string) {
  const args = [
    "list-windows",
    "--json",
    ...(workspace === "focused" ? ["--workspace", "focused"] : ["--all"]),
    "--format",
    "%{app-name} %{window-title} %{window-id} %{app-pid} %{workspace} %{app-bundle-id}",
  ];

  const aerospaceArr = spawnSync("aerospace", args, {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  let windows: Windows = [];
  try {
    const parsedWindows = JSON.parse(aerospaceArr.stdout);

    windows = parsedWindows.map((window: Window) => ({
      ...window,
      "app-path": getAppPath(window["app-bundle-id"].toString()),
    }));
  } catch (error) {
    console.error("Error parsing JSON:", error);
  }

  return windows;
}

export function focusWindow(windowId: string): void {
  spawnSync("aerospace", ["focus", "--window-id", `${windowId}`], {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  popToRoot({ clearSearchBar: true });
}
