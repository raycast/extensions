import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  popToRoot,
  PreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { execaCommand } from "execa";
import * as fs from "fs";

type Error = {
  title: string;
  message: string;
};

function getAdbDir(): string {
  const preferences = getPreferenceValues<PreferenceValues>();
  const adbDir = preferences["adbDir"];
  if (adbDir) {
    return adbDir;
  }

  const home = process.env.HOME;
  return `${home}/Library/Android/sdk/platform-tools`;
}

function existsAdb(): boolean {
  return fs.existsSync(`${getAdbDir()}/adb`);
}

async function getDevices(): Promise<string[]> {
  const adbDir = getAdbDir();
  const { stdout } = await execaCommand(`${adbDir}/adb devices`, { cwd: adbDir });

  const devices: string[] = [];

  stdout.split("\n").forEach((line, index) => {
    if (index != 0 && line.length > 0) {
      devices.push(line.split("\t")[0]);
    }
  });
  return devices;
}

function onSubmit(values: Form.Values) {
  const device = values["device"];
  const text = values["text"];

  if (!text) {
    showToast({
      title: "Error",
      message: "Text is empty.",
      style: Toast.Style.Failure,
    });
    return;
  }
  if (!device) {
    showToast({
      title: "Error",
      message: "Device is not selected.",
      style: Toast.Style.Failure,
    });
    return;
  }

  const excapedText = text.replace(" ", "%s").replace("\\", "\\\\");
  const args = `-s ${device} shell input text "${excapedText}"`;

  const adbDir = getAdbDir();

  showToast({
    title: "Sending...",
    style: Toast.Style.Animated,
  });

  execaCommand(`${adbDir}/adb ${args}`, { cwd: adbDir })
    .then(() => {
      popToRoot({ clearSearchBar: true });
      showHUD("Complete!");
    })
    .catch((e) => {
      showToast({
        title: "Error",
        message: e.message,
        style: Toast.Style.Failure,
      });
    });
}

export default function Command() {
  const [devices, setDevices] = useState<string[]>([]);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    if (!existsAdb()) {
      setError({
        title: "adb command not found!",
        message: "Please check the adb directory path. See `Raycast Preferences > Extensions > Run Android ADB Input`.",
      });
      return;
    }

    (async () => {
      const toast = await showToast({
        title: "Search devices...",
        style: Toast.Style.Animated,
      });

      try {
        const devices = await getDevices();
        setDevices(devices);

        if (devices.length == 0) {
          setError({
            title: "No devices found!",
            message: "Please connect device and re-run.",
          });
        }
      } catch (e) {
        setError({
          title: "Unknown error!",
          message: `${e}`,
        });
      }

      toast.hide();
    })();
  }, []);

  if (error) {
    const markdown = `# ${error.title}\n${error.message}`;
    return <Detail markdown={markdown} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Text" />
      <Form.Dropdown id="device" title="Device">
        {devices.map((device, index) => (
          <Form.Dropdown.Item key={index} value={device} title={device} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
