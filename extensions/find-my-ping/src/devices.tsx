import {
  ActionPanel,
  Action,
  Icon,
  List,
  Form,
  LocalStorage,
  useNavigation,
  environment,
  getPreferenceValues,
} from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { useState, useEffect } from "react";
import path from "path";

interface Device {
  id: string;
  name: string;
  icon: string;
}

interface Preferences {
  siriKeybind: string;
  siriDelay: string;
}

function getIconPath(filename: string): string {
  const appearance = environment.appearance;
  const mode = appearance === "dark" ? "DarkMode" : "LightMode";
  return path.join(environment.assetsPath, mode, filename);
}

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const preferences = getPreferenceValues<Preferences>();

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

  function parseHotkey(hotkey: string) {
    const parts = hotkey.split("+");
    const key = parts[parts.length - 1];
    const modifierMap: Record<string, string> = {
      cmd: "command",
      ctrl: "control",
      opt: "option",
      shift: "shift",
    };
    const modifiers = parts.slice(0, -1).map((m) => `${modifierMap[m] || m} down`);
    return { key, modifiers };
  }

  async function pingDevice(deviceName: string) {
    const { key, modifiers } = parseHotkey(preferences.siriKeybind);
    const delay = parseFloat(preferences.siriDelay);

    const keycodeMap: Record<string, number> = {
      f13: 105,
      f14: 107,
      f15: 113,
      f16: 106,
      f17: 64,
      f18: 79,
      f19: 80,
      f20: 90,
    };

    const keycode = keycodeMap[key.toLowerCase()];

    if (!keycode && key.toLowerCase().startsWith("f")) {
      throw new Error(`Unsupported function key: ${key}. Only f13-f20 are supported.`);
    }
    const modifierString = modifiers.length > 0 ? ` using {${modifiers.join(", ")}}` : "";
    const keyCommand = keycode ? `key code ${keycode}${modifierString}` : `keystroke "${key}"${modifierString}`;

    await runAppleScript(`
    tell application "System Events"
      ${keyCommand}
    end tell
    delay ${delay}
    tell application "System Events"
      keystroke "where's my ${deviceName}"
      delay 0.3
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
