import { ActionPanel, List, Action, Color, Icon, useNavigation, closeMainWindow } from "@raycast/api";
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

  const bootAction = (device: Device) => {
    const navigation = useNavigation();

    return (
      <Action
        title={device.state === "Booted" ? "Open" : "Boot"}
        icon={Icon.Power}
        onAction={() => {
          exec(`xcrun simctl boot ${device.udid}`, () => {
            fetchSimulators();
          });
          exec(`open -g -a Simulator`);
          const appleScript = `
            tell application "System Events"
              repeat
                set windowFound to false
                set theWindows to windows of process "Simulator"
                repeat with theWindow in theWindows
                  set theWindowName to name of theWindow
                  if theWindowName contains "${device.name}" then
                    tell application "Simulator" to activate
                    perform action "AXRaise" of theWindow
                    set windowFound to true
                    exit repeat 
                  end if
                  delay 0.1
                end repeat
                if windowFound then
                  exit repeat
                end if
              end repeat
            end tell
        `;
          exec(`osascript -e '${appleScript}'`);
          navigation.pop();
          closeMainWindow({ clearRootSearch: true });
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

  function getIcon(name: string) {
    if (name.includes("iPhone")) return Icon.Mobile;
    if (name.includes("iPad")) return Icon.Desktop;
    return Icon.Devices;
  }

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
              icon={getIcon(device.name)}
              title={device.name}
              keywords={device.runtime.split(" ")}
              subtitle={device.runtime}
              key={device.udid}
              accessories={[
                { tag: { value: device.state, color: device.state === "Booted" ? Color.Green : Color.SecondaryText } },
              ]}
              actions={
                <ActionPanel>
                  {bootAction(device)}
                  {shutdownAction(device)}
                  <Action.Open title="Open Data Folder" icon={Icon.Folder} target={device.dataPath} />
                  <Action.Open title="Open Logs Folder" icon={Icon.Folder} target={device.logPath} />
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
