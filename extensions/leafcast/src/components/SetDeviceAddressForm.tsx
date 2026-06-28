import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { discoverNanoleafDevices, isValidIPv4 } from "../utils";
import { DiscoveredDevicesList } from "./DiscoveredDevicesList";

interface Props {
  onSetDeviceAddress: (address: string) => void;
}

interface FormValues {
  deviceAddress: string;
}

export function SetDeviceAddressForm({ onSetDeviceAddress }: Props) {
  const { push } = useNavigation();
  const [isScanning, setIsScanning] = useState(false);

  const { handleSubmit, itemProps, setValue, setValidationError } = useForm<FormValues>({
    onSubmit({ deviceAddress }) {
      onSetDeviceAddress(deviceAddress.trim());
    },
    validation: {
      deviceAddress: (value) => {
        if (!value) return FormValidation.Required;
        if (!isValidIPv4(value)) return "Invalid IPv4 address";
      },
    },
    initialValues: { deviceAddress: "" },
  });

  function applyAddress(address: string) {
    setValue("deviceAddress", address);
    setValidationError("deviceAddress", null);
  }

  useEffect(() => {
    attemptAutoScan();
  }, []);

  async function attemptAutoScan() {
    setIsScanning(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Scanning network for devices…" });
    try {
      const devices = await discoverNanoleafDevices();
      if (devices.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "No devices found on the network.";
        return;
      }
      if (devices.length === 1) {
        applyAddress(devices[0].address);
        toast.style = Toast.Style.Success;
        toast.title = `Found ${devices[0].name}`;
        return;
      }
      await toast.hide();
      push(<DiscoveredDevicesList devices={devices} onSelect={applyAddress} />);
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Scan failed. Enter the address manually.";
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <Form
      isLoading={isScanning}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Device Address" icon={Icon.Checkmark} />
          <Action onAction={attemptAutoScan} title="Attempt Auto-Scan" icon={Icon.Network} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.deviceAddress} title="Device Address" placeholder="E.g. 192.168.2.13" />
      <Form.Separator />
      <Form.Description text="Leafcast scans your network for Nanoleaf devices automatically when this command opens. If nothing turned up, you can enter the device's IPv4 address manually or re-run the scan with ⌘+⇧+⏎." />
    </Form>
  );
}
