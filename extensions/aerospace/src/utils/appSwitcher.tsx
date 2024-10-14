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
  console.log(appPath.stdout.trim());

  return appPath.stdout.trim();
}
// aerospace list-windows --json --workspace focused --format "%{app-name} %{window-title} %{window-id} %{app-pid} %{workspace} %{app-bundle-id}"

export function getWindows() {
  const aerospaceArr = spawnSync(
    "aerospace",
    [
      "list-windows",
      "--json",
      "--workspace",
      "focused",
      "--format",
      "%{app-name} %{window-title} %{window-id} %{app-pid} %{workspace} %{app-bundle-id}",
    ],
    {
      env: env(),
      encoding: "utf8",
      timeout: 15000,
    },
  );

  let windows: Windows = [];
  try {
    console.log("beforeParse", aerospaceArr.stdout);
    const parsedWindows = JSON.parse(aerospaceArr.stdout);
    console.log("parsed", parsedWindows);

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
  // const command = `/opt/homebrew/bin/aerospace focus --window-id ${windowId}`;
  // runAppleScript(` do shell script "${command}" `);
  spawnSync("aerospace", ["focus", "--window-id", `${windowId}`], {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });

  popToRoot({ clearSearchBar: true });
}
