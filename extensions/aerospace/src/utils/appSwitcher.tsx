import { environment, popToRoot } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { spawnSync } from "child_process";

interface Window {
  appName: string;
  windowTitle?: string;
  windowId: string;
  appPid: string;
  workspace: string;
  bundleId: string;
  appPath: string;
}

interface Windows extends Array<Window> {}

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

export function getWindows(): Windows {
  const aerospaceArr = spawnSync("sh", [`${environment.assetsPath}/scripts/list-windows.sh`], {
    env: env(),
    encoding: "utf8",
    timeout: 15000,
  });
  const windows: Windows = aerospaceArr.stdout
    .split("\n")
    .filter(Boolean)
    .map((app) => {
      try {
        const appArr = app.split(",").map((window) => {
          //eslint-disable-next-line
          return window.trim().replace(/\\/g, "\\\\").replace(/\"/g, '\\"').replace(/\'/g, "\\'");
        });
        const appParsed = JSON.parse(
          `{ "appName": "${appArr[0]}", "windowTitle": "${appArr[1]}", "windowId": "${appArr[2]}", "appPid": "${appArr[3]}", "workspace": "${appArr[4]}", "bundleId": "${appArr[5]}" }`,
        );
        appParsed.appPath = getAppPath(appParsed.bundleId);

        return appParsed;
      } catch (error) {
        console.error("Error parsing JSON:", error);
        return null;
      }
    });

  console.log(windows);

  return windows;
}

export function focusWindow(windowId: string): void {
  const command = `/opt/homebrew/bin/aerospace focus --window-id ${windowId}`;
  runAppleScript(` do shell script "${command}" `);
  popToRoot({ clearSearchBar: true });
}
