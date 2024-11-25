import { ActionPanel, Action, List, closeMainWindow } from "@raycast/api";
import { spawnSync, SpawnSyncReturns } from "child_process";

function runShellCmd(cmd: string, args: string[]): SpawnSyncReturns<string> {
  return spawnSync(cmd, args, {
    env: { PATH: "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:" },
    encoding: "utf8",
    timeout: 15000,
  });
}

function getShellOutput(result: SpawnSyncReturns<string>): string {
  if (result.error) console.log("err", result.error);
  if (result.stderr) console.log("stderr", result.stderr);
  return result.stdout;
}

type WindowData = {
  window_id: string;
  window_title: string;
  app_name: string;
  workspace_name: string;
  app_bundle_id: string;
};

function parseData(data: string): WindowData[] {
  return data
    .split("\n")
    .map((line) => line.slice(1, -1))
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const [window_id, window_title, app_name, workspace_name, app_bundle_id] = line.split("||");
      return { window_id, window_title, app_name, workspace_name, app_bundle_id };
    });
}

// https://github.com/raycast/extensions/blob/b402a2bf93d3909d731fb79324104d91751b1975/extensions/aerospace/src/utils/appSwitcher.tsx#L20C1-L28C2
function getAppPath(bundleId: string) {
  const args = [`kMDItemCFBundleIdentifier="${bundleId}"`];
  return runShellCmd("mdfind", args).stdout.trim();
}

function getWindows(): WindowData[] {
  const args = [
    "list-windows",
    "--monitor",
    "focused",
    "--format",
    '"%{window-id}||%{window-title}||%{app-name}||%{workspace}||%{app-bundle-id}"',
  ];
  const aerospace_output = getShellOutput(runShellCmd("aerospace", args));
  return parseData(aerospace_output);
}

function switchWindow(window_id: string) {
  let args = ["list-windows", "--focused", "--format", '"%{window-id}"'];
  const current_window = getShellOutput(runShellCmd("aerospace", args)).trim().slice(1, -1);
  if (current_window != window_id) {
    args = ["focus", "--window-id", window_id];
    runShellCmd("aerospace", args);
  }
  closeMainWindow({ clearRootSearch: true });
}

export default function Command() {
  const data = getWindows();

  return (
    <List navigationTitle="App Switcher">
      {data.map((item) => (
        <List.Item
          key={item.window_id}
          title={item.window_title}
          keywords={[item.window_title, item.app_name]}
          // TODO: use `useCachedState` to speed this up??
          icon={{ fileIcon: getAppPath(item.app_bundle_id) }}
          actions={
            <ActionPanel>
              <Action title="Switch Focus" onAction={() => switchWindow(item.window_id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
