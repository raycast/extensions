import { Form, ActionPanel, Action, showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import { Devices } from "./bootedDevices";
import { useEffect, useState } from "react";
import { pushNotification, terminateApp } from "./util";
import { Device } from "./types";
import fs from "fs";
import { showBundleIdEmptyToast, showCouldntLoadDeviceToast, showExecutedToast } from "./toasts";

type Values = {
  bundleId: string;
  files: string[];
};

export default function Command() {
  const [chosenDevice, setChosenDevice] = useState<Device | undefined>();
  const [currentFile, setCurrentFile] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const selectedFinderItems = await getSelectedFinderItems();
        if (selectedFinderItems && selectedFinderItems.length > 0 && isFileValid(selectedFinderItems[0].path)) {
          setCurrentFile([selectedFinderItems[0].path]);
        }
      } catch (error: any) {
        //no op
      }
    })();
  }, []);

  function isFileValid(file: string) {
    if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
      return false;
    }
    return true;
  }

  async function handleSubmit(values: Values) {
    try {
      if (!chosenDevice) {
        await showCouldntLoadDeviceToast();
        return;
      }

      if (values.bundleId.trim().length === 0) {
        await showBundleIdEmptyToast();
        return;
      }

      const file = values.files[0];
      if (!isFileValid(file)) {
        await showToast({ title: "Invalid File", style: Toast.Style.Failure });
        return;
      }

      await pushNotification(chosenDevice.udid, values.bundleId, file);
      await showExecutedToast();
    } catch (error: any) {
      await showToast({ title: `Error: ${error}`, style: Toast.Style.Failure });
    }
  }

  function deviceChoosen(device: Device) {
    setChosenDevice(device);
  }

  return (
    <>
      {!chosenDevice && <Devices onDeviceChoose={deviceChoosen} />}
      {chosenDevice && (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Execute" onSubmit={(values: Values) => handleSubmit(values)} />
            </ActionPanel>
          }
        >
          <Form.TextField id="bundleId" title="Bundle Identifier" placeholder="com.raycast" />
          <Form.FilePicker id="files" allowMultipleSelection={false} defaultValue={currentFile} />
        </Form>
      )}
    </>
  );
}
