import { ActionPanel, Action, Icon, List, Form, LocalStorage, useNavigation, environment } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { useState, useEffect } from "react";
import path from "path";

interface Device {
  id: string;
  name: string;
  icon: string;
}

function getIconPath(filename: string): string {
  const appearance = environment.appearance;
  const mode = appearance === "dark" ? "DarkMode" : "LightMode";
  return path.join(environment.assetsPath, mode, filename);
}

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    LocalStorage.getItem<string>("devices").then((data) => {
      setDevices(data ? JSON.parse(data) : []);
    });
  }, []);

  function saveDevices(newDevices: Device[]) {
    LocalStorage.setItem("devices", JSON.stringify(newDevices));
    setDevices(newDevices);
  }

  function addDevice(name: string, icon: string) {
    const newDevice: Device = {
      id: String(Date.now()),
      name,
      icon,
    };
    saveDevices([...devices, newDevice]);
  }

  function removeDevice(id: string) {
    saveDevices(devices.filter((d) => d.id !== id));
  }

  async function pingDevice(deviceName: string) {
    await runAppleScript(`
      tell application "System Events"
        key code 105 using {command down}
      end tell
      delay 1
      tell application "System Events"
        keystroke "where's my ${deviceName}"
        key code 36
      end tell
    `);
  }

  return (
    <List>
      {devices.map((device) => (
        <List.Item
          key={device.id}
          icon={getIconPath(device.icon)}
          title={device.name}
          actions={
            <ActionPanel>
              <Action title="Ping Device" onAction={() => pingDevice(device.name)} />
              <Action
                title="Remove Device"
                icon={Icon.Trash}
                onAction={() => removeDevice(device.id)}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
      <List.Item
        title="Add Device..."
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.Push title="Add Device" target={<AddDeviceForm onSubmit={addDevice} />} />
          </ActionPanel>
        }
      />
    </List>
  );
}

function AddDeviceForm({ onSubmit }: { onSubmit: (name: string, icon: string) => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) => {
              onSubmit(values.name, values.icon);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Device Name" placeholder="iPhone" />
      <Form.Dropdown id="icon" title="Icon">
        <Form.Dropdown.Item value="Iphone.png" title="iPhone" />
        <Form.Dropdown.Item value="IphoneNew.png" title="iPhone (New)" />
        <Form.Dropdown.Item value="Airpods.png" title="AirPods" />
        <Form.Dropdown.Item value="AirpodsMax.png" title="AirPods Max" />
        <Form.Dropdown.Item value="AirpodsPro.png" title="AirPods Pro" />
      </Form.Dropdown>
    </Form>
  );
}
