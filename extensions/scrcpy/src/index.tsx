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
  alwaysOnTop: boolean;
  audioCodec: string;
  moreOptions: string;
};

export default function Command() {
  const [devices, handleDeviceChange] = useDevices();

  function handleSubmit(values: Values) {
    const serial = values["device"];
    handleDeviceChange({ serial });
    exec(
      `${getScrcpyDir()}/scrcpy \
        ${values["turnScreenOff"] ? "--turn-screen-off" : ""} \
        ${values["stayAwake"] ? "--stay-awake" : ""} \
        ${values["hidKeyboard"] ? "--keyboard=uhid" : ""} \
        ${values["hidMouse"] ? "--mouse=uhid" : ""} \
        ${values["disableAudio"] ? "--no-audio" : ""} \
        ${values["alwaysOnTop"] ? "--always-on-top" : ""} \
        --audio-codec=${values["audioCodec"]} \
        -m ${values["size"]} \
        -s ${serial} \
        ${values["moreOptions"]}`,
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
      },
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
      <Form.Dropdown id="device" title="Device Serial">
        {devices.map((device) => {
          if (device.default) {
            return (
              <Form.Dropdown.Section key={device.serial} title="Previous Device">
                <Form.Dropdown.Item value={device.serial} title={device.serial} />
              </Form.Dropdown.Section>
            );
          }
          return <Form.Dropdown.Item key={device.serial} value={device.serial} title={device.serial} />;
        })}
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
      <Form.Checkbox id="hidKeyboard" defaultValue={true} label="HID keyboard" storeValue />
      <Form.Checkbox id="hidMouse" defaultValue={false} label="HID mouse" storeValue />
      <Form.Checkbox id="alwaysOnTop" defaultValue={false} label="Always on top" storeValue />
      <Form.Dropdown id="audioCodec" title="Audio Codec" storeValue>
        <Form.Dropdown.Item value="opus" title="opus" />
        <Form.Dropdown.Item value="aac" title="aac" />
        <Form.Dropdown.Item value="flac" title="flac" />
        <Form.Dropdown.Item value="raw" title="raw" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField
        id="moreOptions"
        defaultValue=""
        title="More options"
        info="For example: `--audio-bit-rate=64K --audio-buffer=40`"
        storeValue
      />
    </Form>
  );
}
