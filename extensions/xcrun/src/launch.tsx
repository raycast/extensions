import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { Devices } from "./bootedDevices";
import { useState } from "react";
import { launchApp } from "./util";
import { Device } from "./types";
import { showBundleIdEmptyToast, showCouldntLoadDeviceToast, showExecutedToast } from "./toasts";

type Values = {
  bundleId: string;
};

export default function Command() {
  const [chosenDevice, setChosenDevice] = useState<Device | undefined>();

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

      await launchApp(chosenDevice.udid, values.bundleId);
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
        </Form>
      )}
    </>
  );
}
