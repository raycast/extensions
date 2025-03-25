import { useEffect, useState } from "react";
import { learnIP } from "common/learnIP";
import { Action, ActionPanel, Form, showHUD } from "@raycast/api";
import { DevicesItem } from "interfaces/device";
import { listDevices } from "common/listDevices";

const LearnMyIP = () => {
  const [devices, setDevices] = useState<DevicesItem[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | undefined>(undefined);
  const [selectedDeviceError, setSelectedDeviceError] = useState<string | undefined>(undefined);

  const getDevices = async () => {
    const devices = await listDevices();

    setDevices(devices);
  };

  const submit = async () => {
    if (!selectedDevice) {
      setSelectedDeviceError("Please select a device");
      return;
    }

    await learnIP(selectedDevice);

    await showHUD("IP learned ✅");
  };

  useEffect(() => {
    getDevices();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Learn" onAction={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="device"
        title="Device"
        onChange={(value) => setSelectedDevice(value)}
        error={selectedDeviceError}
      >
        {devices.map((device) => (
          <Form.Dropdown.Item key={device.PK} title={device.name} value={device.PK} />
        ))}
      </Form.Dropdown>
    </Form>
  );
};

export default LearnMyIP;
