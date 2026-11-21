import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { useRef, useState } from "react";
import { verifiedClient } from "./lib/actions";
import { describeRokuError } from "./lib/roku";
import type { RokuDevice } from "./lib/types";
import { ConnectionHelp } from "./components/ConnectionHelp";
import { DeviceSetup } from "./components/DeviceSetup";
import { useDevices } from "./components/useDevices";

export default function TypeTextCommand() {
  const saved = useDevices();
  if (!saved.device) return <DeviceSetup {...saved} />;
  return <TypeTextForDevice device={saved.device} devices={saved.devices} choose={saved.choose} />;
}

export function TypeTextForDevice({
  device,
  devices,
  choose,
  navigationTitle,
}: {
  device: RokuDevice;
  devices?: RokuDevice[];
  choose?: (id: string) => Promise<void>;
  /** Only set when pushed; the command root keeps Raycast's title. */
  navigationTitle?: string;
}) {
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const busy = useRef(false);

  async function submit(values: { text: string }) {
    if (busy.current) return;
    if (!values.text.length) {
      setError("Enter the text you want to send.");
      return;
    }
    busy.current = true;
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Sending text…", message: device.name });
    try {
      const client = await verifiedClient(device);
      await client.sendText(values.text);
      toast.style = Toast.Style.Success;
      toast.title = "Text sent";
      toast.message = "Check the TV's text field. Some Roku apps don't accept remote text entry.";
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't send text";
      toast.message = describeRokuError(cause);
    } finally {
      busy.current = false;
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Text to TV" icon={Icon.Keyboard} onSubmit={submit} />
          <Action.Push title="Connection Help" icon={Icon.Info} target={<ConnectionHelp device={device} />} />
        </ActionPanel>
      }
    >
      {devices && choose ? (
        <Form.Dropdown id="device" title="TV" value={device.id} onChange={(id) => void choose(id)}>
          {devices.map((tv) => (
            <Form.Dropdown.Item key={tv.id} value={tv.id} title={tv.name} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.Description title="TV" text={device.name} />
      )}
      <Form.Description text="Open a text field on your Roku first. Sending text types into that field; it doesn't clear existing text or press Search." />
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Text to type on your TV"
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}
