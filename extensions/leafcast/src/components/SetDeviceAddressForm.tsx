import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState } from "react";
import { KNOWN_NANOLEAF_MAC_PREFIXES } from "../constants";

interface Props {
  currentDeviceAddress?: string;
  onSetDeviceAddress: (address: string) => void;
}

const NANOLEAF_MAC_REGEX = new RegExp(
  `at (${KNOWN_NANOLEAF_MAC_PREFIXES.map((prefix) => prefix.replaceAll(":", "\\:")).join("|")})`,
  "i"
);

const IP_REGEX = new RegExp("(?:[0-9]{1,3}.){3}[0-9]{1,3}", "g");

export function SetDeviceAddressForm({ currentDeviceAddress, onSetDeviceAddress }: Props) {
  const [deviceAddress, setDeviceAddress] = useState<string>(currentDeviceAddress ?? "");
  const [error, setError] = useState<string>("");

  const networkScan = useExec("arp", ["-an"], {
    execute: false,
    async onWillExecute() {
      await showToast({ style: Toast.Style.Animated, title: "Scanning network for device..." });
    },
    async onData(data) {
      const deviceEntry = data?.split("\n").find((line) => {
        return NANOLEAF_MAC_REGEX.test(line);
      });
      if (deviceEntry) {
        const addressMatches = deviceEntry.match(IP_REGEX);

        if (addressMatches) {
          setDeviceAddress(addressMatches[0]);

          await showToast({ style: Toast.Style.Success, title: "Potential device found!" });
        } else {
          await showToast({ style: Toast.Style.Failure, title: "Unable to extract device address from scan entry." });
        }
      } else {
        await showToast({ style: Toast.Style.Failure, title: "Unable to find a device on the network." });
      }
    },
  });

  function handleSetDeviceAddress({ deviceAddress }: { deviceAddress: string }) {
    if (IP_REGEX.test(deviceAddress)) {
      setError("");
      onSetDeviceAddress(deviceAddress);
    } else {
      setError("Invalid IPv4 address");
    }
  }

  async function attemptAutoScan() {
    networkScan.revalidate();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSetDeviceAddress} title="Save Device Address" icon={Icon.Checkmark} />
          <Action onAction={attemptAutoScan} title="Attempt Auto-Scan" icon={Icon.Network} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="deviceAddress"
        title="Device Address"
        placeholder="E.g. 192.168.2.13"
        value={deviceAddress}
        onChange={setDeviceAddress}
        error={error}
      ></Form.TextField>
      <Form.Separator />
      <Form.Description text="If you are unable to locate your device's IPv4 address, Leafcast can attempt to auto-scan your network and add the address for you. Hit ⌘+⇧+⏎ to get started." />
    </Form>
  );
}
