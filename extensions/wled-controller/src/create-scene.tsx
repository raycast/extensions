import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation, Color, List } from "@raycast/api";
import { useEffect, useState } from "react";

import { loadDevices } from "./device-storage";
import { WLEDClient, WLEDDevice } from "./wled-api";
import { createScene, DeviceState } from "./scene-storage";

export default function CreateScene() {
  const [devices, setDevices] = useState<WLEDDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const loadedDevices = await loadDevices();
      setDevices(loadedDevices);
      setIsLoading(false);
    }
    loadData();
  }, []);

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  if (devices.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: Icon.LightBulb, tintColor: Color.Orange }}
          title="No Devices"
          description="Add a WLED device first to create scenes"
        />
      </List>
    );
  }

  return <CreateSceneForm devices={devices} />;
}

interface CreateSceneFormProps {
  devices: WLEDDevice[];
  onUpdate?: () => void;
}

interface FormValues {
  name: string;
  description?: string;
  [key: string]: string | boolean | undefined;
}

export function CreateSceneForm({ devices, onUpdate }: CreateSceneFormProps) {
  const { pop } = useNavigation();
  const [sceneName, setSceneName] = useState("");
  const [sceneDescription, setSceneDescription] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<Record<string, boolean>>(() => {
    // Initialize all devices as selected by default
    const initial: Record<string, boolean> = {};
    devices.forEach((device) => {
      initial[device.ip] = true;
    });
    return initial;
  });
  const [nameError, setNameError] = useState<string | undefined>();

  function handleDeviceToggle(deviceIp: string, value: boolean) {
    setSelectedDevices((prev) => ({
      ...prev,
      [deviceIp]: value,
    }));
  }

  async function handleSubmit(values: FormValues) {
    if (!values.name || !values.name.trim()) {
      setNameError("Scene name is required");
      return;
    }

    // Get list of selected device IPs
    const selectedDeviceIps = Object.entries(selectedDevices)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, isSelected]) => isSelected)
      .map(([ip]) => ip);

    if (selectedDeviceIps.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Devices Selected",
        message: "Please select at least one device",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating Scene",
      message: `Capturing state from ${selectedDeviceIps.length} device${selectedDeviceIps.length !== 1 ? "s" : ""}...`,
    });

    try {
      // Fetch state from all selected devices in parallel
      const deviceStatePromises = selectedDeviceIps.map(async (ip) => {
        const device = devices.find((d) => d.ip === ip);
        if (!device) return null;

        try {
          const client = new WLEDClient(device);
          const state = await client.getState();
          const segment = state.state.seg?.[0];
          const color = segment?.col?.[0];

          const deviceState: DeviceState = {
            deviceIp: device.ip,
            deviceName: device.name,
            power: state.state.on,
            brightness: state.state.bri,
            color: color ? [color[0], color[1], color[2]] : undefined,
            effectId: segment?.fx,
            effectSpeed: segment?.sx,
            effectIntensity: segment?.ix,
            paletteId: segment?.pal,
          };

          return deviceState;
        } catch (error) {
          console.error(`Failed to get state from ${device.name}:`, error);
          await showToast({
            style: Toast.Style.Failure,
            title: `Failed to get state from ${device.name}`,
            message: String(error),
          });
          return null;
        }
      });

      const deviceStates = (await Promise.all(deviceStatePromises)).filter(
        (state): state is DeviceState => state !== null,
      );

      if (deviceStates.length === 0) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to Create Scene";
        toast.message = "Could not capture state from any device";
        return;
      }

      await createScene({
        name: values.name.trim(),
        description: values.description?.trim(),
        deviceStates,
      });

      toast.style = Toast.Style.Success;
      toast.title = "Scene Created";
      toast.message = `"${values.name}" with ${deviceStates.length} device${deviceStates.length !== 1 ? "s" : ""}`;

      onUpdate?.();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to Create Scene";
      toast.message = String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Scene" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a scene by capturing the current state of selected devices" />

      <Form.TextField
        id="name"
        title="Scene Name"
        placeholder="e.g., Movie Time, Relaxing Evening"
        value={sceneName}
        onChange={(value) => {
          setSceneName(value);
          if (nameError && value.trim()) {
            setNameError(undefined);
          }
        }}
        error={nameError}
      />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Optional description"
        value={sceneDescription}
        onChange={setSceneDescription}
      />

      <Form.Separator />

      <Form.Description title="Select Devices" text="Choose which devices to include in this scene" />

      {devices.map((device) => (
        <Form.Checkbox
          key={device.ip}
          id={`device_${device.ip}`}
          label={device.name}
          value={selectedDevices[device.ip]}
          onChange={(value) => handleDeviceToggle(device.ip, value)}
        />
      ))}
    </Form>
  );
}
