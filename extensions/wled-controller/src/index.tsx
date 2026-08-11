import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  Form,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  useNavigation,
  Detail,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { WLEDClient, WLEDDevice } from "./wled-api";
import {
  loadDevices,
  saveDevices as saveDevicesToStorage,
  loadLastCustomColor,
  saveLastCustomColor,
} from "./device-storage";
import { CreateSceneForm } from "./create-scene";

/**
 * Add Device Form
 */
function AddDeviceForm({ onDeviceAdded }: { onDeviceAdded: (device: WLEDDevice) => void }) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [ipError, setIpError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string; ip: string; testConnection: boolean }) {
    if (!values.name || values.name.trim() === "") {
      setNameError("Name is required");
      return;
    }
    if (!values.ip || values.ip.trim() === "") {
      setIpError("IP address is required");
      return;
    }

    const device: WLEDDevice = {
      name: values.name.trim(),
      ip: values.ip.trim(),
    };

    // Test connection if requested
    if (values.testConnection) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Testing Connection",
        message: `Connecting to ${device.ip}...`,
      });

      try {
        const client = new WLEDClient(device);
        const state = await client.getState();

        toast.style = Toast.Style.Success;
        toast.title = "Connection Successful";
        toast.message = `Connected to ${state.info.name || device.name} (v${state.info.ver})`;
      } catch {
        toast.style = Toast.Style.Failure;
        toast.title = "Connection Failed";
        toast.message = `Could not reach ${device.ip}`;

        const shouldContinue = await confirmAlert({
          title: "Connection Failed",
          message: `Could not connect to ${device.ip}. Add device anyway?`,
          primaryAction: {
            title: "Add Anyway",
            style: Alert.ActionStyle.Default,
          },
          dismissAction: {
            title: "Cancel",
            style: Alert.ActionStyle.Cancel,
          },
        });

        if (!shouldContinue) {
          return;
        }
      }
    }

    onDeviceAdded(device);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Device" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a new WLED device" />
      <Form.TextField
        id="name"
        title="Device Name"
        placeholder="Bedroom Strip"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="ip"
        title="IP Address"
        placeholder="192.168.1.100"
        error={ipError}
        onChange={() => setIpError(undefined)}
      />
      <Form.Checkbox id="testConnection" label="Test Connection" defaultValue={true} />
    </Form>
  );
}

/**
 * Brightness Form
 */
function BrightnessForm({
  device,
  currentBrightness,
  onUpdate,
}: {
  device: WLEDDevice;
  currentBrightness: number;
  onUpdate: () => void;
}) {
  const { pop } = useNavigation();
  const [brightness, setBrightness] = useState(String(currentBrightness));

  async function handleSubmit(values: { brightness: string }) {
    const brightnessValue = parseInt(values.brightness);
    if (isNaN(brightnessValue) || brightnessValue < 0 || brightnessValue > 255) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Invalid Brightness",
        message: "Brightness must be between 0 and 255",
      });
      return;
    }

    const client = new WLEDClient(device);
    await client.setBrightness(brightnessValue);
    await showToast({
      style: Toast.Style.Success,
      title: "Brightness Set",
      message: `${device.name} brightness set to ${Math.round((brightnessValue / 255) * 100)}%`,
    });
    onUpdate();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Brightness" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Adjust brightness for ${device.name}`} />
      <Form.TextField
        id="brightness"
        title="Brightness (0-255)"
        placeholder={String(currentBrightness)}
        value={brightness}
        onChange={setBrightness}
      />
      <Form.Description text={`Current: ${Math.round((currentBrightness / 255) * 100)}%`} />
      <Form.Separator />
      <Form.Description text="Quick presets:" />
      <Form.Description text="• 255 = 100% (Maximum)" />
      <Form.Description text="• 191 = 75%" />
      <Form.Description text="• 127 = 50%" />
      <Form.Description text="• 64 = 25%" />
      <Form.Description text="• 0 = 0% (Off)" />
    </Form>
  );
}

/**
 * Color Picker
 */
function ColorPicker({ device, onUpdate }: { device: WLEDDevice; onUpdate: () => void }) {
  const { pop } = useNavigation();

  interface ColorPreset {
    name: string;
    hex: string;
    rgb: [number, number, number];
    color: Color;
  }

  const colorPresets: ColorPreset[] = [
    { name: "White", hex: "#FFFFFF", rgb: [255, 255, 255], color: Color.PrimaryText },
    { name: "Warm White", hex: "#FFE4B5", rgb: [255, 228, 181], color: Color.Yellow },
    { name: "Red", hex: "#FF0000", rgb: [255, 0, 0], color: Color.Red },
    { name: "Orange", hex: "#FFA500", rgb: [255, 165, 0], color: Color.Orange },
    { name: "Yellow", hex: "#FFFF00", rgb: [255, 255, 0], color: Color.Yellow },
    { name: "Lime", hex: "#00FF00", rgb: [0, 255, 0], color: Color.Green },
    { name: "Green", hex: "#008000", rgb: [0, 128, 0], color: Color.Green },
    { name: "Cyan", hex: "#00FFFF", rgb: [0, 255, 255], color: Color.Blue },
    { name: "Blue", hex: "#0000FF", rgb: [0, 0, 255], color: Color.Blue },
    { name: "Purple", hex: "#800080", rgb: [128, 0, 128], color: Color.Purple },
    { name: "Magenta", hex: "#FF00FF", rgb: [255, 0, 255], color: Color.Magenta },
    { name: "Pink", hex: "#FFC0CB", rgb: [255, 192, 203], color: Color.Magenta },
  ];

  async function applyColor(preset: ColorPreset) {
    const client = new WLEDClient(device);
    await client.setColor(preset.rgb[0], preset.rgb[1], preset.rgb[2]);
    await showToast({
      style: Toast.Style.Success,
      title: "Color Applied",
      message: `${device.name} set to ${preset.name}`,
    });
    onUpdate();
    pop();
  }

  return (
    <List searchBarPlaceholder="Search colors...">
      <List.Section title="Color Presets">
        {colorPresets.map((preset) => (
          <List.Item
            key={preset.name}
            title={preset.name}
            subtitle={preset.hex}
            icon={{ source: Icon.CircleFilled, tintColor: preset.color }}
            actions={
              <ActionPanel>
                <Action title="Apply Color" icon={Icon.Brush} onAction={() => applyColor(preset)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Custom Color">
        <List.Item
          title="Custom Color Picker"
          subtitle="RGB sliders and hex input"
          icon={{ source: Icon.Pencil, tintColor: Color.Purple }}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Color Picker"
                icon={Icon.Pencil}
                target={<ColorWheel device={device} onUpdate={onUpdate} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

/**
 * Color Wheel (RGB Sliders + Hex Input)
 */
function ColorWheel({ device, onUpdate }: { device: WLEDDevice; onUpdate: () => void }) {
  const { pop } = useNavigation();
  const [red, setRed] = useState("255");
  const [green, setGreen] = useState("0");
  const [blue, setBlue] = useState("0");
  const [hexInput, setHexInput] = useState("#FF0000");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved color on mount
  useEffect(() => {
    async function loadSavedColor() {
      const savedColor = await loadLastCustomColor();
      if (savedColor) {
        setRed(String(savedColor.red));
        setGreen(String(savedColor.green));
        setBlue(String(savedColor.blue));
        setHexInput(savedColor.hex);
      }
      setIsLoaded(true);
    }
    loadSavedColor();
  }, []);

  // Calculate hex color from RGB
  function rgbToHex(r: number, g: number, b: number): string {
    return (
      "#" +
      [r, g, b]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase()
    );
  }

  // Parse hex to RGB
  function hexToRgb(hex: string): [number, number, number] | null {
    const match = hex.match(/#?([0-9A-Fa-f]{6})/);
    if (!match) return null;
    const hexValue = match[1];
    return [
      parseInt(hexValue.substring(0, 2), 16),
      parseInt(hexValue.substring(2, 4), 16),
      parseInt(hexValue.substring(4, 6), 16),
    ];
  }

  const currentR = Math.max(0, Math.min(255, parseInt(red) || 0));
  const currentG = Math.max(0, Math.min(255, parseInt(green) || 0));
  const currentB = Math.max(0, Math.min(255, parseInt(blue) || 0));
  const currentHex = rgbToHex(currentR, currentG, currentB);

  // Save color to storage
  async function saveColor(r: number, g: number, b: number, hex: string) {
    await saveLastCustomColor({ red: r, green: g, blue: b, hex });
  }

  // Update hex when RGB changes
  function updateRed(value: string) {
    setRed(value);
    const r = Math.max(0, Math.min(255, parseInt(value) || 0));
    const newHex = rgbToHex(r, currentG, currentB);
    setHexInput(newHex);
    if (isLoaded) saveColor(r, currentG, currentB, newHex);
  }

  function updateGreen(value: string) {
    setGreen(value);
    const g = Math.max(0, Math.min(255, parseInt(value) || 0));
    const newHex = rgbToHex(currentR, g, currentB);
    setHexInput(newHex);
    if (isLoaded) saveColor(currentR, g, currentB, newHex);
  }

  function updateBlue(value: string) {
    setBlue(value);
    const b = Math.max(0, Math.min(255, parseInt(value) || 0));
    const newHex = rgbToHex(currentR, currentG, b);
    setHexInput(newHex);
    if (isLoaded) saveColor(currentR, currentG, b, newHex);
  }

  // Update RGB when hex changes
  function updateHex(value: string) {
    setHexInput(value);
    const rgb = hexToRgb(value);
    if (rgb) {
      setRed(String(rgb[0]));
      setGreen(String(rgb[1]));
      setBlue(String(rgb[2]));
      if (isLoaded) saveColor(rgb[0], rgb[1], rgb[2], value);
    }
  }

  async function handleSubmit() {
    const r = Math.max(0, Math.min(255, parseInt(red) || 0));
    const g = Math.max(0, Math.min(255, parseInt(green) || 0));
    const b = Math.max(0, Math.min(255, parseInt(blue) || 0));

    const client = new WLEDClient(device);
    await client.setColor(r, g, b);
    await showToast({
      style: Toast.Style.Success,
      title: "Color Applied",
      message: `${device.name} set to ${rgbToHex(r, g, b)}`,
    });
    onUpdate();
    pop();
  }

  async function applyPresetColor(r: number, g: number, b: number) {
    setRed(String(r));
    setGreen(String(g));
    setBlue(String(b));
    setHexInput(rgbToHex(r, g, b));
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Apply Color" icon={Icon.Check} onAction={handleSubmit} />
          <ActionPanel.Section title="Quick Colors">
            <Action
              title="Red"
              icon={{ source: Icon.CircleFilled, tintColor: Color.Red }}
              onAction={() => applyPresetColor(255, 0, 0)}
            />
            <Action
              title="Green"
              icon={{ source: Icon.CircleFilled, tintColor: Color.Green }}
              onAction={() => applyPresetColor(0, 255, 0)}
            />
            <Action
              title="Blue"
              icon={{ source: Icon.CircleFilled, tintColor: Color.Blue }}
              onAction={() => applyPresetColor(0, 0, 255)}
            />
            <Action
              title="Yellow"
              icon={{ source: Icon.CircleFilled, tintColor: Color.Yellow }}
              onAction={() => applyPresetColor(255, 255, 0)}
            />
            <Action
              title="Cyan"
              icon={{ source: Icon.CircleFilled, tintColor: Color.Blue }}
              onAction={() => applyPresetColor(0, 255, 255)}
            />
            <Action
              title="Magenta"
              icon={{ source: Icon.CircleFilled, tintColor: Color.Magenta }}
              onAction={() => applyPresetColor(255, 0, 255)}
            />
            <Action
              title="White"
              icon={{ source: Icon.CircleFilled, tintColor: Color.PrimaryText }}
              onAction={() => applyPresetColor(255, 255, 255)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.Description text={`Custom Color Picker for ${device.name}`} />

      <Form.Description text={`Current Color: ${currentHex} - RGB: (${currentR}, ${currentG}, ${currentB})`} />

      <Form.Separator />

      <Form.TextField
        id="hex"
        title="Hex Color"
        placeholder="#FF0000"
        value={hexInput}
        onChange={updateHex}
        info="Enter a hex color (e.g., #FF5500)"
      />

      <Form.Separator />

      <Form.TextField
        id="red"
        title="🔴 Red (0-255)"
        placeholder="0-255"
        value={red}
        onChange={updateRed}
        info="Red channel intensity"
      />

      <Form.TextField
        id="green"
        title="🟢 Green (0-255)"
        placeholder="0-255"
        value={green}
        onChange={updateGreen}
        info="Green channel intensity"
      />

      <Form.TextField
        id="blue"
        title="🔵 Blue (0-255)"
        placeholder="0-255"
        value={blue}
        onChange={updateBlue}
        info="Blue channel intensity"
      />

      <Form.Separator />

      <Form.Description text="💡 Tip: Use the quick color actions (Cmd+K) to set preset colors instantly" />
    </Form>
  );
}

/**
 * Effect Picker
 */
function EffectPicker({ device, effects, onUpdate }: { device: WLEDDevice; effects: string[]; onUpdate: () => void }) {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");

  async function applyEffect(effectId: number, effectName: string) {
    const client = new WLEDClient(device);
    await client.setEffect(effectId);
    await showToast({
      style: Toast.Style.Success,
      title: "Effect Applied",
      message: `${device.name} set to ${effectName}`,
    });
    onUpdate();
    pop();
  }

  const filteredEffects = effects.filter((effect) => effect.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <List searchBarPlaceholder="Search effects..." onSearchTextChange={setSearchText} throttle>
      <List.Section title={`${filteredEffects.length} Effects`}>
        {filteredEffects.map((effect) => {
          const effectId = effects.indexOf(effect);
          return (
            <List.Item
              key={effectId}
              title={effect}
              subtitle={`ID: ${effectId}`}
              icon={{ source: Icon.Stars, tintColor: Color.Purple }}
              actions={
                <ActionPanel>
                  <Action title="Apply Effect" icon={Icon.Wand} onAction={() => applyEffect(effectId, effect)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

/**
 * Brightness Form Wrapper - loads current brightness before showing form
 */
function BrightnessFormWrapper({ device, onUpdate }: { device: WLEDDevice; onUpdate: () => void }) {
  const [brightness, setBrightness] = useState<number>(127);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBrightness() {
      try {
        const client = new WLEDClient(device);
        const state = await client.getState();
        setBrightness(state.state.bri);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Brightness",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadBrightness();
  }, []);

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading brightness..." />;
  }

  return <BrightnessForm device={device} currentBrightness={brightness} onUpdate={onUpdate} />;
}

/**
 * Effect Picker Wrapper - loads effects before showing picker
 */
function EffectPickerWrapper({ device, onUpdate }: { device: WLEDDevice; onUpdate: () => void }) {
  const [effects, setEffects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEffects() {
      try {
        const client = new WLEDClient(device);
        const state = await client.getState();
        setEffects(state.effects);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to Load Effects",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadEffects();
  }, []);

  if (isLoading) {
    return <Detail isLoading={true} markdown="Loading effects..." />;
  }

  return <EffectPicker device={device} effects={effects} onUpdate={onUpdate} />;
}

/**
 * Main Command - Device List
 */
export default function Command() {
  const [devices, setDevices] = useState<WLEDDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDevicesFromStorage();
  }, []);

  async function loadDevicesFromStorage() {
    setIsLoading(true);
    try {
      const loadedDevices = await loadDevices();
      setDevices(loadedDevices);
    } catch (error) {
      console.error("Failed to load devices:", error);
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddDevice(device: WLEDDevice) {
    const updatedDevices = [...devices, device];
    setDevices(updatedDevices);
    await saveDevicesToStorage(updatedDevices);
    await showToast({
      style: Toast.Style.Success,
      title: "Device Added",
      message: `${device.name} has been added`,
    });
  }

  async function handleDeleteDevice(device: WLEDDevice) {
    const confirmed = await confirmAlert({
      title: "Delete Device",
      message: `Are you sure you want to remove "${device.name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      const updatedDevices = devices.filter((d) => !(d.ip === device.ip && d.name === device.name));
      setDevices(updatedDevices);
      await saveDevicesToStorage(updatedDevices);
      await showToast({
        style: Toast.Style.Success,
        title: "Device Removed",
        message: `${device.name} has been removed`,
      });
    }
  }

  if (devices.length === 0) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          icon={Icon.LightBulb}
          title="No WLED Devices"
          description="Add your first WLED device to get started"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Device"
                icon={Icon.Plus}
                target={<AddDeviceForm onDeviceAdded={handleAddDevice} />}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  async function togglePowerQuick(device: WLEDDevice) {
    try {
      const client = new WLEDClient(device);
      const state = await client.getState();
      await client.setPower(!state.state.on);
      await showToast({
        style: Toast.Style.Success,
        title: state.state.on ? "Device Turned Off" : "Device Turned On",
        message: device.name,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Toggle Power",
        message: String(error),
      });
    }
  }

  async function setBrightnessQuick(device: WLEDDevice, brightness: number) {
    try {
      const client = new WLEDClient(device);
      await client.setBrightness(brightness);
      const percent = Math.round((brightness / 255) * 100);
      await showToast({
        style: Toast.Style.Success,
        title: "Brightness Set",
        message: `${device.name} - ${percent}%`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Set Brightness",
        message: String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search devices...">
      <List.Section title={`${devices.length} Device${devices.length !== 1 ? "s" : ""}`}>
        {devices.map((device, index) => (
          <List.Item
            key={`${device.ip}-${index}`}
            title={device.name}
            subtitle={device.ip}
            icon={{ source: Icon.LightBulb, tintColor: Color.Yellow }}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Toggle Power" icon={Icon.Power} onAction={() => togglePowerQuick(device)} />
                  <Action.Push
                    title="Save as Scene"
                    icon={Icon.Stars}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "s" },
                      Windows: { modifiers: ["ctrl"], key: "s" },
                    }}
                    target={<CreateSceneForm devices={devices} onUpdate={() => {}} />}
                  />
                  <Action.Push
                    title="Set Color"
                    icon={Icon.Brush}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "c" },
                      Windows: { modifiers: ["ctrl"], key: "c" },
                    }}
                    target={
                      <ColorPicker
                        device={device}
                        onUpdate={() => {
                          /* no-op for quick action */
                        }}
                      />
                    }
                  />
                  <Action.Push
                    title="Set Effect"
                    icon={Icon.Stars}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "f" },
                      Windows: { modifiers: ["ctrl"], key: "f" },
                    }}
                    target={
                      <EffectPickerWrapper
                        device={device}
                        onUpdate={() => {
                          /* no-op for quick action */
                        }}
                      />
                    }
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Brightness">
                  <Action.Push
                    title="Set Brightness"
                    icon={Icon.Sun}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "b" },
                      Windows: { modifiers: ["ctrl"], key: "b" },
                    }}
                    target={
                      <BrightnessFormWrapper
                        device={device}
                        onUpdate={() => {
                          /* no-op for quick action */
                        }}
                      />
                    }
                  />
                  <Action
                    title="100%"
                    icon={Icon.Sun}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "1" },
                      Windows: { modifiers: ["ctrl"], key: "1" },
                    }}
                    onAction={() => setBrightnessQuick(device, 255)}
                  />
                  <Action
                    title="75%"
                    icon={Icon.Circle}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "2" },
                      Windows: { modifiers: ["ctrl"], key: "2" },
                    }}
                    onAction={() => setBrightnessQuick(device, 191)}
                  />
                  <Action
                    title="50%"
                    icon={Icon.Circle}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "3" },
                      Windows: { modifiers: ["ctrl"], key: "3" },
                    }}
                    onAction={() => setBrightnessQuick(device, 127)}
                  />
                  <Action
                    title="25%"
                    icon={Icon.Circle}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "4" },
                      Windows: { modifiers: ["ctrl"], key: "4" },
                    }}
                    onAction={() => setBrightnessQuick(device, 64)}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "r" },
                      Windows: { modifiers: ["ctrl"], key: "r" },
                    }}
                    onAction={loadDevicesFromStorage}
                  />
                  <Action.Push
                    title="Add New Device"
                    icon={Icon.Plus}
                    shortcut={{
                      macOS: { modifiers: ["cmd"], key: "n" },
                      Windows: { modifiers: ["ctrl"], key: "n" },
                    }}
                    target={<AddDeviceForm onDeviceAdded={handleAddDevice} />}
                  />
                  <Action
                    title="Delete Device"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{
                      macOS: { modifiers: ["ctrl"], key: "x" },
                      Windows: { modifiers: ["ctrl"], key: "d" },
                    }}
                    onAction={() => handleDeleteDevice(device)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
