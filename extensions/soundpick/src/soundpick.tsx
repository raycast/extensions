import { useEffect, useState } from "react";
import { Icon, List, Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { SoundOutputDevice } from "./shared/types";
import EmptyListView from "./components/EmptyListView";
import SoundOutputService from "./sound-output-service";
import AppleScriptParser from "./apple-script-parser";

export default function Soundpick() {
  // MARK: - Services

  const soundOutputService = new SoundOutputService({
    parser: new AppleScriptParser(),
  });

  // MARK: - Hooks

  const [isLoading, setIsLoading] = useState(true);
  const [listOfDevices, setListOfDevices] = useState(Array<SoundOutputDevice>);

  function showDeviceListView(): Array<JSX.Element> {
    return listOfDevices.map((device) => (
      <List.Item
        key={device.name}
        title={device.name}
        subtitle={device.isConnected ? "Connected" : undefined}
        actions={
          <ActionPanel>
            <Action
              title="Connect"
              icon={Icon.ArrowRight}
              onAction={() => {
                connectToDeviceActionHandler(device);
              }}
            />
          </ActionPanel>
        }
      />
    ));
  }

  async function connectToDeviceActionHandler(newDevice: SoundOutputDevice): Promise<void> {
    const connectedDevice = listOfDevices.at(0);
    const newDeviceIsTheConnectedDevice =
      connectedDevice?.name === newDevice.name && connectedDevice?.isConnected === true;

    if (newDeviceIsTheConnectedDevice) {
      await showToast({
        style: Toast.Style.Success,
        title: `Playing on ${newDevice.name}`,
      });
      await soundOutputService.closeSystemPreferences();
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Connecting to ${newDevice.name}`,
    });

    const didConnect = await soundOutputService.connectToDevice(newDevice.name);

    if (didConnect) {
      await fetchSoundOutputDevices();
      toast.style = Toast.Style.Success;
      toast.title = `Playing on ${newDevice.name}`;
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = `Failed connecting to ${newDevice.name}`;
    }

    await soundOutputService.closeSystemPreferences();
  }

  async function fetchSoundOutputDevices(): Promise<void> {
    const response: Array<SoundOutputDevice> = await soundOutputService.fetchDevices();
    setListOfDevices(response);
    setIsLoading(false);
  }

  useEffect(() => {
    fetchSoundOutputDevices();
  }, []);

  return (
    <List
      enableFiltering={true}
      isLoading={isLoading}
      navigationTitle="Change Sound Output"
      searchBarPlaceholder="Search for devices..."
    >
      {listOfDevices.length == 0 ? EmptyListView() : showDeviceListView()}
    </List>
  );
}
