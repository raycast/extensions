import { ActionPanel, List, Action, Color, Icon, showToast, Toast, Keyboard, confirmAlert } from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";
import { Device } from "./types";
import { erase, fetchSimulators } from "./util";

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [query, setQuery] = useState<string | undefined>();
  const [isLoading, setLoading] = useState<boolean>(true);

  const fetchAllSimulators = () => {
    (async () => {
      try {
        const devices = await fetchSimulators();
        setDevices(devices);
        setLoading(false);
      } catch (error: any) {
        setLoading(false);
        await showToast({ title: `Error: ${error}`, style: Toast.Style.Failure });
      }
    })();
  };
  useEffect(() => {
    fetchAllSimulators();
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
            fetchAllSimulators();
          });
        }}
      />
    );
  };

  const restartAction = (device: Device) => {
    if (device.state !== "Booted") {
      return null;
    }
    return (
      <Action
        shortcut={Keyboard.Shortcut.Common.Refresh}
        title="Restart"
        icon={Icon.Repeat}
        onAction={() => {
          exec(`xcrun simctl shutdown ${device.udid}`, (err, stdout) => {
            fetchAllSimulators();
            exec(`xcrun simctl boot ${device.udid}`, (err, stdout) => {
              fetchAllSimulators();
            });
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
            fetchAllSimulators();
          });
        }}
      />
    );
  };
  const eraseAction = (device: Device) => {
    return (
      <Action
        title="Erase"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.RemoveAll}
        onAction={() => {
          (async () => {
            try {
              if (await confirmAlert({ title: "Are you sure?" })) {
                await erase(device.udid);
                await showToast({ title: `Executed` });
              }
            } catch (error: any) {
              await showToast({ title: `Error: ${error}`, style: Toast.Style.Failure });
            }
          })();
        }}
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by name..."
      onSearchTextChange={(query) => setQuery(query)}
    >
      {devices
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
                  {restartAction(device)}
                  {shutdownAction(device)}
                  {eraseAction(device)}

                  <Action.ShowInFinder title="Show Data" path={device.dataPath} />
                  <Action.ShowInFinder title="Show Logs" path={device.logPath} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
