import { ActionPanel, List, Action, showToast, Toast } from "@raycast/api";
import React from "react";
import { runAppleScript } from "run-applescript";

async function getAllRunningApps() {
  const result = await runAppleScript(
    'tell application "System Events" to get the short name of every process whose background only is false'
  );
  return result.split(", ").map((app) => app.trim());
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
  apps: string[];
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
    getAllRunningApps().then((apps) => {
      this.setState({ apps: apps, isLoading: false });
    });
  }

  render() {
    return (
      <List isLoading={this.state.isLoading}>
        {this.state.apps.map((app) => (
          <List.Item
            title={app}
            key={app}
            actions={
              <ActionPanel>
                <Action
                  title="Quit"
                  onAction={() => {
                    const success = quitAppWithToast(app);
                    if (success) {
                      this.setState({ apps: this.state.apps.filter((a) => a !== app) });
                    }
                  }}
                />
                <Action
                  title="Restart"
                  onAction={() => {
                    restartAppWithToast(app);
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
