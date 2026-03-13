import { Action, ActionPanel, Form, Toast, showHUD } from "@raycast/api";
import { Clipboard } from "@raycast/api";
import { closeMainWindow } from "@raycast/api";
import { showToast } from "@raycast/api";
import * as path from "path";
import { getAdbDir, getDevices, existsAdb, getScreenshotSaveLocation } from "./android-utils";
import { ExecException, exec } from "child_process";
import { useEffect, useState } from "react";
type Values = {
  device: string;
};

async function onSubmit(values: Form.Values) {
  const submitValues: Values = values as Values;
  const { device } = submitValues;
  const adbCaptureFilename = `${Date.now()}.png`;
  const filePath = path.join(getScreenshotSaveLocation(), adbCaptureFilename);
  const adbDir = getAdbDir();
  const adb = `${adbDir}/adb  -s ${device} `;
  const shellscript = `${adb} exec-out screencap -p > ${filePath}`;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Capturing screen`,
  });
  console.log(`shellscript `, shellscript);
  exec(shellscript, async (error: ExecException | null, stdout: string, stderr: string) => {
    if (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to capture screen";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    } else {
      toast.style = Toast.Style.Success;
      toast.message = "Captured screen";
      await Clipboard.copy({ file: filePath });
      showHUD("Copied captured screen to clipboard");
      closeMainWindow();
    }
  });
}
export default function Command() {
  const [devices, setDevices] = useState<string[]>();
  const [listError, setListError] = useState<string | undefined>();

  useEffect(() => {
    try {
      const devices = getDevices();
      setDevices(devices);
    } catch (error) {
      setDevices([]);
      if (existsAdb()) {
        setListError("Not connected device");
      } else {
        setListError("Not adb found");
      }
    }
  }, []);
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Capture" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="device" title="Devices" error={listError} isLoading={devices === undefined}>
        {devices?.map((device, index) => (
          <Form.Dropdown.Item key={index} value={device} title={device} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
