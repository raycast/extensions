import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { Devices } from "./bootedDevices";
import { useState } from "react";
import { openUrl } from "./util";
import { Device } from "./types";
import { showCouldntLoadDeviceToast, showExecutedToast } from "./toasts";

type Values = {
  url: string;
};

export default function Command() {
  const [chosenDevice, setChosenDevice] = useState<Device | undefined>();

  async function handleSubmit(values: Values) {
    try {
      if (!chosenDevice) {
        await showCouldntLoadDeviceToast();
        return;
      }
      if (values.url.trim().length === 0) {
        await showToast({ title: "Url field is required" });
        return;
      }

      await openUrl(chosenDevice.udid, values.url);
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
          <Form.TextField id="url" title="URL" placeholder="https://raycast.com" />
        </Form>
      )}
    </>
  );
}
