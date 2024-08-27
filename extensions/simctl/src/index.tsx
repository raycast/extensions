import { ActionPanel, List, Action, Color, Icon } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { exec } from "child_process";
import { useEffect, useState } from "react";

export default function Command() {
  const [state, setState] = useCachedState<State[]>("state", []);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSimulators = () => {
    setIsLoading(true);
    exec(`xcrun simctl list --json devices`, (err, stdout) => {
      if (err != null) {
        console.log(err);
        setIsLoading(false);
        return;
      }
      const list: SimctlList = JSON.parse(stdout);
      const devices = Object.entries(list.devices).flatMap(([key, devices]) =>
        devices
          .filter((device) => device.isAvailable)
          .map((device) => {
            // e.g. com.apple.CoreSimulator.SimRuntime.watchOS-8-5
            const os = key
              .replaceAll("com.apple.CoreSimulator.SimRuntime.", "") // watchOS-8-5
              .split("-"); // [watchOS, 8, 5]
            const osName = os[0]; // watchOS
            const osVer = os.slice(1).join("."); // 8.5
            const runtime = `${osName} ${osVer}`; // watchOS 8.5

            return { ...device, runtime };
          }),
      );
      setState(devices);
      setIsLoading(false);
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
          exec(`xcrun simctl boot ${device.udid}`, () => {
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
          exec(`xcrun simctl shutdown ${device.udid}`, () => {
            fetchSimulators();
          });
        }}
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by name or runtime...">
      {state
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
              icon="list-icon.png"
              title={device.name}
              keywords={device.runtime.split(" ")}
              subtitle={device.runtime}
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
    [key in `com.apple.CoreSimulator.SimRuntime.${string}`]: Device[];
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
type State = Device & {
  runtime: string;
};
