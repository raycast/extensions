import {
  showToast,
  Toast,
  confirmAlert,
  List,
  Icon,
  Image,
  Color,
  useNavigation,
  ActionPanel,
  Action,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useDeviceApi } from "./hooks/use-device-api";
import { useEffect, useState } from "react";
import { SetDeviceAddressForm } from "./components/SetDeviceAddressForm";

export default function Command() {
  const { deviceAddress, pairDevice, setDeviceAddress } = useDeviceApi();
  const [status, setStatus] = useState("Waiting to pair...");
  const [message, setMessage] = useState("");
  const [icon, setIcon] = useState<Image.ImageLike>(Icon.Clock);
  const { pop } = useNavigation();

  useEffect(() => {
    if (deviceAddress) attemptToPairDevice();
  }, [deviceAddress]);

  async function attemptToPairDevice() {
    if (
      await confirmAlert({
        title: "Place your device in pairing mode",
        message:
          "Before we begin pairing you must put your device into pairing mode. To do this, press and hold the power button on your device until the LED starts flashing.",
        primaryAction: {
          title: "I'm ready to pair",
        },
      })
    ) {
      const toast = await showToast({ title: "Fetching token...", style: Toast.Style.Animated });

      setStatus("Fetching token...");
      setIcon(Icon.Signal3);

      try {
        await pairDevice();

        toast.title = "Device successfully paired!";

        toast.style = Toast.Style.Success;

        setStatus("Device successfully paired!");
        setIcon({ source: Icon.CheckCircle, tintColor: Color.Green });

        pop();
      } catch (e) {
        showFailureToast("Ensure device is in pairing mode", {
          title: "Pairing failed",
        });
        setStatus("Pairing failed");
        setMessage(
          "Please ensure you're both using the correct IPv4 address and have the device in pairing mode and try again."
        );
        setIcon({ source: Icon.XMarkCircle, tintColor: Color.Red });
      }
    } else {
      setStatus("Device pairing cancelled");
      setIcon(Icon.MinusCircle);
    }
  }

  function resetDeviceAddress() {
    setDeviceAddress("");
  }

  return deviceAddress ? (
    <List
      actions={
        <ActionPanel>
          <Action title="Pair Device" onAction={attemptToPairDevice} icon={Icon.Plug} />
          <Action
            title="Reset Device Address"
            style={Action.Style.Destructive}
            onAction={resetDeviceAddress}
            icon={Icon.XMarkCircle}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView title={status} icon={icon} description={message} />
    </List>
  ) : (
    <SetDeviceAddressForm onSetDeviceAddress={setDeviceAddress} currentDeviceAddress={deviceAddress} />
  );
}
