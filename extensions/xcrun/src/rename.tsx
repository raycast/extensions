import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { Devices } from "./bootedDevices";
import { useState } from "react";
import { rename } from "./util";
import { Device } from "./types";
import { showCouldntLoadDeviceToast, showExecutedToast } from "./toasts";

type Values = {
  name: string;
};

export default function Command() {
  const [chosenDevice, setChosenDevice] = useState<Device | undefined>();

  async function handleSubmit(values: Values) {
    try {
      if (!chosenDevice) {
        await showCouldntLoadDeviceToast();
        return;
      }

      //TODO GET ALL DEVICES INSTEAD OF BOOTED.
      await rename(chosenDevice.udid, values.name);
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
          <Form.TextField id="name" title="New Name" placeholder="Raycast-Dev-NoSpaces" />
        </Form>
      )}
    </>
  );
}
