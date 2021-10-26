import {
  ActionPanel,
  closeMainWindow,
  Detail,
  Icon,
  List,
  popToRoot,
  preferences,
  showHUD,
  showToast,
  ToastStyle,
} from "@raycast/api";
import fs from "fs";
import { useEffect, useState } from "react";
import { AudioDevice } from "./audio-device";
import { exec } from "child_process";
import { promisify } from "util";

const execp = promisify(exec);

type UseAudioDevicesResponse = {
  isLoading: boolean;
  data: {
    devices: AudioDevice[];
    current: AudioDevice;
  };
};

export function useAudioDevices(type: "input" | "output") {
  const [isLoading, setIsLoading] = useState(true);
  const [audioDevices, setAudioDevices] = useState<UseAudioDevicesResponse["data"]>();

  useEffect(() => {
    const fetchDevices = async () => {
      const allDevicesResult = await execp(`${switchAudioPath()} -a -t ${type} -f json`);
      const currentDeviceResult = await execp(`${switchAudioPath()} -c -t ${type} -f json`);
      const devices = parseSwitchAudioOutput(allDevicesResult.stdout);
      const current = parseSwitchAudioOutput(currentDeviceResult.stdout)[0];

      return {
        devices,
        current,
      };
    };

    fetchDevices()
      .then(setAudioDevices)
      .catch(() => showToast(ToastStyle.Failure, `Error!`, `There was an error fetching the audio devices.`))
      .finally(() => setIsLoading(false));
  }, [type]);

  return {
    isLoading,
    data: audioDevices,
  };
}

type DeviceListProps = {
  type: "input" | "output";
};

export function DeviceList({ type }: DeviceListProps) {
  const { isLoading, data } = useAudioDevices(type);

  return (
    <List isLoading={isLoading}>
      {data &&
        data.devices.map((d) => (
          <List.Item
            key={d.uid}
            title={d.name}
            icon={deviceIcon(d)}
            accessoryIcon={d.uid === data.current.uid ? Icon.Checkmark : undefined}
            actions={
              <ActionPanel>
                <SetAudioDeviceAction device={d} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

type SetAudioDeviceActionProps = {
  device: AudioDevice;
};

function SetAudioDeviceAction({ device }: SetAudioDeviceActionProps) {
  return (
    <ActionPanel.Item
      title="Select"
      onAction={async () => {
        try {
          await execp(`${switchAudioPath()} -t ${device.type} -i ${device.id}`);
          closeMainWindow({ clearRootSearch: true });
          popToRoot({ clearSearchBar: true });
          showHUD(`${deviceIcon(device)} Active audio device set to ${device.name}`);
        } catch (e) {
          console.log(e);
          showToast(ToastStyle.Failure, `Error!`, `There was an error setting the audio device to ${device.name}`);
        }
      }}
    />
  );
}

export function deviceIcon(device: AudioDevice) {
  return device.type === "input" ? "🎙" : "🔈";
}

export function parseSwitchAudioOutput(raw: string): AudioDevice[] {
  return raw
    .split("\n")
    .filter((x) => !!x)
    .map((x) => JSON.parse(x));
}

export function switchAudioPath() {
  return preferences.switchAudioSourcePath.value as string;
}

export function isSwitchAudioInstalled() {
  try {
    return fs.existsSync(switchAudioPath());
  } catch (e) {
    return false;
  }
}

export function DependenciesNotMet() {
  const msg = `
  # switchaudio-osx not installed
  Please install the switchaudio-osx package via Homebrew by running the following command.

  \`brew install switchaudio-osx\`

  You can find more information over [here](https://github.com/deweller/switchaudio-osx).
  `;

  return <Detail navigationTitle="switchaudio-osx not installed" markdown={msg} />;
}
