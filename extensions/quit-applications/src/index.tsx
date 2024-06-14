import React from "react";
import { ActionPanel, List, Action, showToast, Toast, popToRoot, clearSearchBar } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

function applicationNameFromPath(path: string): string {
  /* Example:
   * '/Applications/Visual Studio Code.app' -> 'Visual Studio Code'
   */

  const pathParts = path.split("/");
  const appName = pathParts[pathParts.length - 1];
  return appName.replace(".app", "");
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

  return result.split(", ").map((appPath: string) => appPath.trim());
}

function quitApp(app: string) {
  return runAppleScript(`try
  tell application "${app}" to quit
  on error error_message number error_number
      if error_number is equal to -128 then
      --Keep Calm and Carry On
      else
          display dialog error_message
      end if
end try`);
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

function getQuickLinkForApp(appName: string, action: string): string {
  const context = JSON.stringify({ appName, action });
  const encodedContext = encodeURIComponent(context);
  return `raycast://extensions/mackopes/quit-applications/index?context=${encodedContext}`;
}

interface AppListState {
  apps: {
    name: string;
    path: string;
  }[];
  isLoading: boolean;
  launchContext?: { appName: string; action: string /* quit | restart */ };
}

class AppList extends React.Component<Record<string, never>, AppListState> {
  constructor(props: Record<string, never>) {
    super(props);

    this.state = {
      apps: [],
      isLoading: true,
      launchContext: props.launchContext,
    };
  }

  componentDidMount() {
    if (this.state.launchContext && this.state.launchContext.appName && this.state.launchContext.action) {
      const { appName, action } = this.state.launchContext;

      if (action === "quit") {
        quitAppWithToast(appName);
        popToRoot().then();
        return;
      }

      if (action === "restart") {
        restartAppWithToast(appName);
        popToRoot().then();
        return;
      }
    }

    getRunningAppsPaths().then((appCandidatePaths) => {
      // filter out all apps that do not end with .app
      const apps = appCandidatePaths.map((path) => ({ name: applicationNameFromPath(path), path }));

      this.setState({ apps, isLoading: false });
    });
  }

  render() {
    return (
      <List isLoading={this.state.isLoading}>
        {this.state.apps.map((app) => (
          <List.Item
            title={app.name}
            key={app.name}
            icon={{ fileIcon: app.path }}
            actions={
              <ActionPanel>
                <Action
                  title="Quit"
                  onAction={() => {
                    const success = quitAppWithToast(app.name);
                    if (success) {
                      this.setState({ apps: this.state.apps.filter((a) => a.name !== app.name) });
                    }
                    clearSearchBar();
                  }}
                />
                <Action
                  title="Restart"
                  onAction={() => {
                    restartAppWithToast(app.name);
                  }}
                />
                <Action.CreateQuicklink
                  title="Create Quit Quicklink"
                  quicklink={{ link: getQuickLinkForApp(app.name, "quit"), name: `Quit ${app.name}` }}
                />
                <Action.CreateQuicklink
                  title="Create Restart Quicklink"
                  quicklink={{ link: getQuickLinkForApp(app.name, "restart"), name: `Restart ${app.name}` }}
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
