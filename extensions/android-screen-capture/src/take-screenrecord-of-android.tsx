import { Action, ActionPanel, Form, Toast, showHUD } from "@raycast/api";
import { Clipboard } from "@raycast/api";
import { closeMainWindow } from "@raycast/api";
import { showToast } from "@raycast/api";
import * as path from "path";
import { getAdbDir, getDevices, existsAdb, getScreenshotSaveLocation } from "./android-utils";
import { ExecException, exec } from "child_process";
import { useEffect, useState } from "react";
type Values = {
  timelimit: string;
  bugreport: boolean;
  device: string;
};

async function onSubmit(values: Form.Values) {
  const submitValues: Values = values as Values;
  const { timelimit, bugreport, device } = submitValues;
  const adbCaptureFolder = `/sdcard/Download/raycast-android-capture`;
  const adbCaptureFilename = `${Date.now()}.mp4`;
  const recordAdbFilePath = path.join(adbCaptureFolder, adbCaptureFilename);
  const filePath = path.join(getScreenshotSaveLocation(), adbCaptureFilename);
  const bugReportSegment = bugreport ? "--bugreport" : "";
  const adbDir = getAdbDir();
  const adb = `${adbDir}/adb  -s ${device} `;
  const shellscript = `${adb} shell mkdir -p ${adbCaptureFolder} && ${adb} shell screenrecord ${bugReportSegment} --time-limit=${timelimit} ${recordAdbFilePath} && ${adb} pull ${recordAdbFilePath} ${filePath}`;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Recording screen in ${timelimit}s`,
  });
  console.log(`shellscript `, shellscript);
  exec(shellscript, async (error: ExecException | null, stdout: string, stderr: string) => {
    if (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to record screen";
      if (error instanceof Error) {
        toast.message = error.message;
      }
    } else {
      toast.style = Toast.Style.Success;
      toast.message = "Recorded screen";
      await Clipboard.copy({ file: filePath });
      showHUD("Copied recorded screen to clipboard");
      closeMainWindow();
    }
  });
}
export default function Command() {
  const [devices, setDevices] = useState<string[]>();
  const [timeLimitError, setTimeLimitError] = useState<string | undefined>();
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
          <Action.SubmitForm title="Record" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="timelimit"
        title="Time Limit(s)"
        placeholder="Set the maximum recording time, in seconds"
        defaultValue="10"
        error={timeLimitError}
        storeValue
        onBlur={(event) => {
          const value = event.target.value;
          if ((value?.length ?? 0) === 0 || isNaN(Number(value))) {
            setTimeLimitError("The field should be filled with number");
            return;
          } else {
            const seconds = parseInt(value + "");
            if (seconds < 1 || seconds > 180) {
              setTimeLimitError(`Time limit ${seconds}s outside acceptable range [1,180]`);
              return;
            }
          }
          if (timeLimitError && timeLimitError.length > 0) {
            setTimeLimitError(undefined);
          }
        }}
      />
      <Form.Checkbox id="bugreport" title="Bugreport" label="Add Additional Device Information" storeValue />
      <Form.Dropdown id="device" title="Devices" error={listError} isLoading={devices === undefined}>
        {devices?.map((device, index) => (
          <Form.Dropdown.Item key={index} value={device} title={device} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
