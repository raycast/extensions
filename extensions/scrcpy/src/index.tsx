import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import useDevices from "./use-devices";
import { getAdbDir, getScrcpyDir } from "./utils";

type Values = {
  device: string;
  size: string;
  disableAudio: boolean;
  turnScreenOff: boolean;
  stayAwake: boolean;
  hidKeyboard: boolean;
  hidMouse: boolean;
};

export default function Command() {
  const devices = useDevices();

  function handleSubmit(values: Values) {
    exec(
      `${getScrcpyDir()}/scrcpy \
        ${values["turnScreenOff"] ? "--turn-screen-off" : ""} \
        ${values["stayAwake"] ? "--stay-awake" : ""} \
        ${values["hidKeyboard"] ? "--hid-keyboard" : ""} \
        ${values["hidMouse"] ? "--hid-mouse" : ""} \
        ${values["disableAudio"] ? "--no-audio" : ""} \
        -m ${values["size"]} -s ${values["device"]}`,
      {
        env: {
          ...process.env,
          PATH: `${getAdbDir()}:${process.env["PATH"]}`,
        },
      },
      (err) => {
        if (err) {
          showToast({
            style: Toast.Style.Failure,
            title: "Failed to call scrcpy! Please config it in extension preference",
            message: err.message,
          });
        }
      }
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Mirror!" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="device" title="Device Serial" storeValue>
        {devices.map((device) => (
          <Form.Dropdown.Item key={device} value={device} title={device} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="size" title="Screen Size" storeValue>
        <Form.Dropdown.Item value="1024" title="1024" />
        <Form.Dropdown.Item value="0" title="Device size" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="Advanced Options" />
      <Form.Checkbox id="disableAudio" defaultValue={true} label="Disable audio" storeValue />
      <Form.Checkbox id="turnScreenOff" defaultValue={true} label="Turn screen off" storeValue />
      <Form.Checkbox id="stayAwake" defaultValue={true} label="Stay awake" storeValue />
      <Form.Checkbox id="hidKeyboard" defaultValue={true} label="HID keyboard (USB only)" storeValue />
      <Form.Checkbox id="hidMouse" defaultValue={false} label="HID mouse (USB only)" storeValue />
    </Form>
  );
}
