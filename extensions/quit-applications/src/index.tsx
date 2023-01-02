import { ActionPanel, List, Action, showHUD } from "@raycast/api";
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
                    quitApp(app);
                    showHUD(`Quitting ${app}`);
                    this.setState({ apps: this.state.apps.filter((a) => a !== app) });
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
