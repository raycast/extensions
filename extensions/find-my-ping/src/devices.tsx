import {
  ActionPanel,
  Action,
  Icon,
  List,
  Form,
  LocalStorage,
  useNavigation,
  environment,
  showToast,
  Toast,
  closeMainWindow,
} from "@raycast/api";
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

function validateDelay(value: string): string | undefined {
  const num = parseFloat(value);
  if (isNaN(num)) return "Delay must be a number";
  if (num < 0) return "Delay cannot be negative";
  if (num > 10) return "Delay cannot exceed 10 seconds";
  return undefined;
}

function validateKeybind(value: string): string | undefined {
  if (!value) return "Keybind cannot be empty";

  const parts = value.split("+");
  if (parts.length < 2) return "Keybind must have modifiers (e.g., cmd+f13)";

  const key = parts[parts.length - 1].toLowerCase();
  const validModifiers = ["cmd", "ctrl", "opt", "shift"];
  const modifiers = parts.slice(0, -1);

  for (const mod of modifiers) {
    if (!validModifiers.includes(mod.toLowerCase())) {
      return `Invalid modifier: ${mod}`;
    }
  }

  const supportedKeys = ["f13", "f14", "f15", "f16", "f17", "f18", "f19", "f20"];
  if (!supportedKeys.includes(key) && key.length !== 1) {
    return "Key must be f13-f20 or a single character";
  }

  return undefined;
}

async function simulateKeybind(keybindString: string) {
  await closeMainWindow();
  const { key, modifiers } = parseHotkey(keybindString);

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

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Simulating in 10 seconds...",
  });

  for (let i = 9; i >= 0; i--) {
    toast.title = `Simulating in ${i + 1} seconds...`;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  await toast.hide();

  await runAppleScript(`
  tell application "System Events"
    ${keyCommand}
  end tell
`);

  await showToast({
    style: Toast.Style.Success,
    title: "Keybind simulated",
  });
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

function OnboardingForm({ onComplete }: { onComplete: () => void }) {
  const [keybind, setKeybind] = useState("");
  const [delay, setDelay] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([LocalStorage.getItem<string>("siriKeybind"), LocalStorage.getItem<string>("siriDelay")]).then(
      ([savedKeybind, savedDelay]) => {
        setKeybind(savedKeybind || "cmd+f13");
        setDelay(savedDelay || "1");
        setIsLoading(false);
      },
    );
  }, []);

  async function handleSubmit() {
    const keybindError = validateKeybind(keybind);
    const delayError = validateDelay(delay);
    if (keybindError || delayError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid input",
        message: keybindError || delayError,
      });
      return;
    }

    await LocalStorage.setItem("siriKeybind", keybind);
    await LocalStorage.setItem("siriDelay", delay);
    await showToast({
      style: Toast.Style.Success,
      title: "Settings saved",
    });
    onComplete();
  }

  async function handleSimulate() {
    await LocalStorage.setItem("siriKeybind", keybind);
    await LocalStorage.setItem("siriDelay", delay);
    await simulateKeybind(keybind);
  }
  if (isLoading) {
    return <Form isLoading={true} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Continue"
            onAction={async () => {
              await handleSubmit();
            }}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action
            title="Run Keybind"
            icon={Icon.Keyboard}
            onAction={handleSimulate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="keybind"
        title="Siri Keyboard Shortcut"
        placeholder="cmd+f13"
        value={keybind}
        onChange={setKeybind}
      />
      <Form.TextField id="delay" title="Siri Delay (seconds)" placeholder="1" value={delay} onChange={setDelay} />
      <Form.Description text="Fn key is not supported" />
      <Form.Description text="Press cmd+r to simulate the button press" />
      <Form.Description text="Press cmd+enter to proceed" />
    </Form>
  );
}

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([LocalStorage.getItem<string>("devices"), LocalStorage.getItem<string>("hasOnboarded")]).then(
      ([devicesData, onboardedData]) => {
        setDevices(devicesData ? JSON.parse(devicesData) : []);
        setHasOnboarded(onboardedData === "true");
      },
    );
  }, []);

  async function completeOnboarding() {
    await LocalStorage.setItem("hasOnboarded", "true");
    setHasOnboarded(true);
  }

  if (hasOnboarded === null) {
    return <List isLoading={true} />;
  }

  if (!hasOnboarded) {
    return <OnboardingForm onComplete={completeOnboarding} />;
  }

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
    try {
      const savedKeybind = await LocalStorage.getItem<string>("siriKeybind");
      const savedDelay = await LocalStorage.getItem<string>("siriDelay");
      const keybind = savedKeybind || "cmd+f13";
      const delay = parseFloat(savedDelay || "1");
      const { key, modifiers } = parseHotkey(keybind);

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
        await showToast({
          style: Toast.Style.Failure,
          title: "Unsupported function key",
          message: `${key} is not supported. Only f13-f20 are supported.`,
        });
        return;
      }

      const modifierString = modifiers.length > 0 ? ` using {${modifiers.join(", ")}}` : "";
      const keyCommand = keycode ? `key code ${keycode}${modifierString}` : `keystroke "${key}"${modifierString}`;

      await showToast({
        style: Toast.Style.Animated,
        title: "Pinging device...",
        message: deviceName,
      });

      await runAppleScript(`
    tell application "System Events"
      ${keyCommand}
    end tell
    delay ${delay}
    tell application "System Events"
      keystroke "ping my ${deviceName}"
      delay 0.3
      key code 36
    end tell
  `);

      await showToast({
        style: Toast.Style.Success,
        title: "Ping sent",
        message: deviceName,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to ping device",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
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
              <Action.Push
                title="Settings"
                icon={Icon.Gear}
                target={
                  <OnboardingForm
                    onComplete={() => {
                      setHasOnboarded(true); // Triggers re-render
                    }}
                  />
                }
                shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
              />
              <Action
                title="Remove Device"
                icon={Icon.Trash}
                onAction={() => removeDevice(device.id)}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
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
            <Action.Push
              title="Settings"
              icon={Icon.Gear}
              target={
                <OnboardingForm
                  onComplete={() => {
                    setHasOnboarded(true); // Triggers re-render
                  }}
                />
              }
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
