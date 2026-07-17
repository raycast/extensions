import { Action, ActionPanel, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { Discovery } from "magic-home";
import { Device } from "../types/device";
import Style = Toast.Style;

async function handleDeviceSave(device: Device) {
  await LocalStorage.setItem(`device-${device.id}`, JSON.stringify(device));
  await showToast({ title: "Device saved", style: Style.Success });
}

function Actions(props: { item: Device }) {
  return (
    <ActionPanel title={props.item.model}>
      <ActionPanel.Section>
        <Action title={"Add to My Devices"} onAction={() => handleDeviceSave(props.item)} icon={Icon.Plus}></Action>
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const discoveryRef = useRef<Discovery | null>(null);

  useEffect(() => {
    if (!discoveryRef.current) {
      discoveryRef.current = new Discovery();
      discoveryRef.current
        .scan(1000)
        .then((devices) => {
          setDevices(devices);
          setLoading(false);
        })
        .catch(console.error);
    }
  }, []);

  return (
    <List isLoading={loading}>
      {devices?.map((item, index) => (
        <List.Item
          key={index}
          title={item.id}
          subtitle={`Model ${item.model}`}
          icon={Icon.Devices}
          actions={<Actions item={item} />}
        />
      ))}
    </List>
  );
}
