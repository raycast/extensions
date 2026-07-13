import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  Form,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getDevices, execAdb } from "./utils/adb";
import { useState } from "react";
import { openTerminalWithCommand } from "./utils/terminal";
import { getErrorMessage } from "./utils/errors";

export default function Command() {
  const {
    isLoading,
    data: devices,
    error,
    revalidate,
  } = usePromise(getDevices, []);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to get devices",
      message: error.message,
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search devices...">
      <List.EmptyView
        title="No devices found"
        description="Make sure your Android device is connected via USB or Wi-Fi"
      />
      {devices?.map((device) => (
        <List.Item
          key={device.id}
          icon={Icon.Mobile}
          title={device.model}
          subtitle={device.id}
          accessories={[{ text: device.state }]}
          actions={
            <ActionPanel>
              <Action
                title="Reload Devices"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action.Push
                title="Connect to Device Ip"
                icon={Icon.Network}
                target={<ConnectDevice />}
              />
              <Action
                title="Reboot Device"
                icon={Icon.Power}
                onAction={() => execAdb("reboot", device.id).then(revalidate)}
              />
              <Action
                title="Open Shell in Terminal"
                icon={Icon.Terminal}
                onAction={() =>
                  openTerminalWithCommand(`adb -s ${device.id} shell`)
                }
              />
            </ActionPanel>
          }
        />
      ))}
      {devices?.length === 0 && (
        <List.Item
          title="Connect via IP"
          icon={Icon.Network}
          actions={
            <ActionPanel>
              <Action.Push
                title="Connect to Device Ip"
                target={<ConnectDevice />}
              />
              <Action title="Reload" onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function ConnectDevice() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { ip: string }) {
    if (!values.ip) {
      showToast(Toast.Style.Failure, "Please enter an IP address");
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      title: "Connecting...",
      style: Toast.Style.Animated,
    });
    try {
      const output = await execAdb(`connect ${values.ip}`);
      if (output.includes("connected to")) {
        toast.style = Toast.Style.Success;
        toast.title = "Connected Successfully";
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to Connect";
        toast.message = output;
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Connect";
      toast.message = getErrorMessage(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Connect" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="ip"
        title="IP Address"
        placeholder="e.g. 192.168.1.10:5555"
      />
    </Form>
  );
}
