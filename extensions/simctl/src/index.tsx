import { ActionPanel, List, Action, Color, Icon } from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";

export default function Command() {
  const [state, setState] = useState<Device[]>([]);
  const [query, setQuery] = useState<string | undefined>(undefined);

  const fetchSimulators = () => {
    exec(`xcrun simctl list --json devices`, (err, stdout) => {
      if (err != null) {
        console.log(err);
        return;
      }
      const list: SimctlList = JSON.parse(stdout);
      const devices = Object.keys(list.devices)
        .map((key) => {
          return list.devices[key];
        })
        .flat();
      setState(devices);
    });
  };

  useEffect(() => {
    fetchSimulators();
  }, []);

  const openAction = (device: Device) => {
    if (device.state !== "Booted") {
      return null;
    }
    return (
      <Action
        title="Open"
        icon={Icon.Window}
        onAction={() => {
          exec(`open -g -a Simulator`);
          const appleScript = `
        if running of application "Simulator" then
          tell application "System Events"
            set theWindows to windows of (processes whose name is "Simulator")
            repeat with theWindow in (the first item of theWindows)
              set theWindowName to name of theWindow
              if theWindowName contains "${device.name}" then
                perform action "AXRaise" of theWindow
              end if
            end repeat
          end tell
          tell the application "Simulator"
            activate
          end tell
        end if
        `;
          exec(`osascript -e '${appleScript}'`);
        }}
      />
    );
  };

  const bootAction = (device: Device) => {
    if (device.state === "Booted") {
      return null;
    }
    return (
      <Action
        title="Boot"
        icon={Icon.Power}
        onAction={() => {
          exec(`xcrun simctl boot ${device.udid}`, (err, stdout) => {
            fetchSimulators();
          });
        }}
      />
    );
  };

  const shutdownAction = (device: Device) => {
    if (device.state !== "Booted") {
      return null;
    }
    return (
      <Action
        title="Shutdown"
        icon={Icon.XMarkCircle}
        style={Action.Style.Destructive}
        onAction={() => {
          exec(`xcrun simctl shutdown ${device.udid}`, (err, stdout) => {
            fetchSimulators();
          });
        }}
      />
    );
  };

  return (
    <List
      isLoading={state.length === 0}
      searchBarPlaceholder="Filter by name..."
      onSearchTextChange={(query) => setQuery(query)}
    >
      {state
        .filter((device) => {
          if (device.isAvailable == false) {
            return false;
          }

          if (query == null) {
            return true;
          }
          const nameMatches = device.name.toLowerCase().includes(query.toLowerCase());
          return nameMatches;
        })
        .sort((a, b) => {
          if (a.state === "Booted" && b.state !== "Booted") {
            return -1;
          } else if (a.state !== "Booted" && b.state === "Booted") {
            return 1;
          }
          return 0;
        })
        .map((device) => {
          return (
            <List.Item
              id={device.udid}
              title={device.name}
              key={device.udid}
              accessories={[
                { tag: { value: device.state, color: device.state === "Booted" ? Color.Green : Color.SecondaryText } },
              ]}
              actions={
                <ActionPanel>
                  {openAction(device)}
                  {bootAction(device)}
                  {shutdownAction(device)}
                  <Action
                    title="Show Data"
                    icon={Icon.Folder}
                    onAction={() => {
                      exec(`open ${device.dataPath}`);
                    }}
                  />
                  <Action
                    title="Show Logs"
                    icon={Icon.Folder}
                    onAction={() => {
                      exec(`open ${device.logPath}`);
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

type SimctlList = {
  devices: {
    [key: string]: Device[];
  };
};

type Device = {
  lastBootedAt: Date;
  dataPath: string;
  dataPathSize: number;
  logPath: string;
  udid: string;
  isAvailable: boolean;
  logPathSize: number;
  deviceTypeIdentifier: string;
  state: string; // "Booted" | "Shutdown"
  name: string;
};
