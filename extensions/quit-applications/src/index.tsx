import { ActionPanel, List, Action, showToast, Toast } from "@raycast/api";
import React from "react";
import { runAppleScript } from "run-applescript";
import { execSync } from "child_process";

function applicationNameFromPath(path: string): string {
  /* Example:
   * '/Applications/Visual Studio Code.app' -> 'Visual Studio Code'
   */

  const pathParts = path.split("/");
  const appName = pathParts[pathParts.length - 1];
  return appName.replace(".app", "");
}

function applicationIconFromPath(path: string): string {
  /* Example:
   * '/Applications/Visual Studio Code.app' -> '/Applications/Visual Studio Code.app/Contents/Resources/{file name}.icns'
   */

  // read path/Contents/Info.plist and look for <key>CFBundleIconFile</key>

  const infoPlist = `${path}/Contents/Info.plist`;
  const stdout = execSync(
    [
      "plutil",
      "-convert",
      "json",
      '"' + infoPlist + '"',
      "-o",
      // By using a dash ("-") for the -o parameter value the output
      // will be printed in the stdout instead into a local file
      "-",
    ].join(" ")
  ).toString();

  const json = JSON.parse(stdout);
  let iconFileName = json.CFBundleIconFile;

  if (!iconFileName) {
    // no icon found. fallback to empty string (no icon)
    return "";
  }

  // if icon doesn't end with .icns, add it
  if (!iconFileName.endsWith(".icns")) {
    iconFileName = `${iconFileName}.icns`;
  }

  const iconPath = `${path}/Contents/Resources/${iconFileName}`;
  return iconPath;
}

async function getRunningAppsPaths(): Promise<string[]> {
  const result = await runAppleScript(`
    set appPaths to {}
    tell application "System Events"
      repeat with aProcess in (get file of every process whose background only is false)
        set processPath to POSIX path of aProcess
        set end of appPaths to processPath
      end repeat
    end tell

    return appPaths
  `);

  return result.split(", ").map((appPath) => appPath.trim());
}

function quitApp(app: string) {
  return runAppleScript(`tell application "${app}" to quit`);
}

function restartApp(app: string) {
  return runAppleScript(`tell application "${app}"
                            repeat while its running
                              quit
                              delay 0.5
	                          end repeat
	                          activate
                        end tell`);
}

function quitAppWithToast(app: string): boolean {
  try {
    quitApp(app);
    showToast({
      style: Toast.Style.Success,
      title: `Quit ${app}`,
    });
    return true;
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: `Unable to quit ${app}`,
    });
    return false;
  }
}

function restartAppWithToast(app: string): boolean {
  try {
    restartApp(app);
    showToast({
      style: Toast.Style.Success,
      title: `Restarted ${app}`,
    });
    return true;
  } catch {
    showToast({
      style: Toast.Style.Failure,
      title: `Unable to restart ${app}`,
    });
    return false;
  }
}

interface AppListState {
  apps: {
    name: string;
    iconPath: string;
  }[];
  isLoading: boolean;
}

class AppList extends React.Component<Record<string, never>, AppListState> {
  constructor(props: Record<string, never>) {
    super(props);

    this.state = {
      apps: [],
      isLoading: true,
    };
  }

  componentDidMount() {
    getRunningAppsPaths().then((appCandidatePaths) => {
      // filter out all apps that do not end with .app
      const appPaths = appCandidatePaths.filter((appPath) => appPath.endsWith(".app"));

      console.log(appPaths);

      const appNames = appPaths.map((appPath) => applicationNameFromPath(appPath));
      const appIcons = appPaths.map((appPath) => applicationIconFromPath(appPath));

      const apps = appNames.map((appName, index) => {
        return {
          name: appName,
          iconPath: appIcons[index],
        };
      });

      this.setState({ apps: apps, isLoading: false });
    });
  }

  render() {
    return (
      <List isLoading={this.state.isLoading}>
        {this.state.apps.map((app) => (
          <List.Item
            title={app.name}
            key={app.name}
            icon={app.iconPath}
            actions={
              <ActionPanel>
                <Action
                  title="Quit"
                  onAction={() => {
                    const success = quitAppWithToast(app.name);
                    if (success) {
                      this.setState({ apps: this.state.apps.filter((a) => a.name !== app.name) });
                    }
                  }}
                />
                <Action
                  title="Restart"
                  onAction={() => {
                    restartAppWithToast(app.name);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }
}

export default AppList;
