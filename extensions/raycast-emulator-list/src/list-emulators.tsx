import { ActionPanel, List, Action, Icon, showToast, Toast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { exec } from "child_process";
import { platform } from "os";
import { useState } from "react";

interface IOSSimulator {
  udid: string;
  name: string;
  state: string;
  isAvailable: boolean;
}

interface SimctlDevices {
  devices: Record<string, IOSSimulator[]>;
}

const isMacOS = platform() === "darwin";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { isLoading: isLoadingAndroid, data: androidData, error: androidError } = useExec("emulator", ["-list-avds"]);

  const {
    isLoading: isLoadingIOS,
    data: iosData,
    error: iosError,
  } = useExec("xcrun", ["simctl", "list", "devices", "-j"], { execute: isMacOS });

  const emulators = androidData?.split("\n").filter((name) => name.trim() !== "") ?? [];

  const iosSimulators: IOSSimulator[] =
    isMacOS && iosData
      ? Object.values((JSON.parse(iosData) as SimctlDevices).devices).flatMap((devices) =>
          devices.filter((d) => d.isAvailable),
        )
      : [];

  if (androidError) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to list Android emulators",
      message: androidError.message,
    });
  }

  if (iosError) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to list iOS simulators",
      message: iosError.message,
    });
  }

  const isLoading = isLoadingAndroid || (isMacOS && isLoadingIOS);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search emulators..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      <List.Section title="Android Emulators">
        {emulators.map((emulator) => (
          <List.Item
            key={emulator}
            icon={Icon.Mobile}
            title={emulator}
            actions={
              <ActionPanel>
                <Action
                  title="Start Emulator"
                  icon={Icon.Play}
                  onAction={async () => {
                    exec(`emulator @${emulator}`, (error) => {
                      if (error) {
                        showToast({
                          style: Toast.Style.Failure,
                          title: "Failed to start emulator",
                          message: error.message,
                        });
                      }
                    });
                    await showToast({
                      style: Toast.Style.Success,
                      title: "Starting emulator",
                      message: emulator,
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="iOS Simulators">
        {isMacOS ? (
          iosSimulators.map((simulator) => (
            <List.Item
              key={simulator.udid}
              icon={Icon.Mobile}
              title={simulator.name}
              subtitle={simulator.state}
              actions={
                <ActionPanel>
                  <Action
                    title="Boot Simulator"
                    icon={Icon.Play}
                    onAction={async () => {
                      exec(`xcrun simctl boot "${simulator.udid}"`, (error) => {
                        if (error && !error.message.includes("Unable to boot device in current state: Booted")) {
                          showToast({
                            style: Toast.Style.Failure,
                            title: "Failed to boot simulator",
                            message: error.message,
                          });
                          return;
                        }
                        exec("open -a Simulator");
                      });
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Booting simulator",
                        message: simulator.name,
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.Item
            key={searchText ? "" : "ios-unavailable"}
            icon={Icon.Info}
            title={searchText ? "" : "iOS simulators are only available on macOS"}
            keywords={[]}
          />
        )}
      </List.Section>
    </List>
  );
}
