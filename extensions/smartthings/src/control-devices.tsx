import {
  Grid,
  showToast,
  Toast,
  ActionPanel,
  Action,
  useNavigation,
  getPreferenceValues,
  Form,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { Device, DeviceCategory } from "./types";
import { toggleDevice, setLightLevel, setLightColor, setTemperature as apiSetTemperature } from "./utils";

type DeviceComponentStatus = Exclude<Device["status"], undefined>;

const ICON_URLS = {
  switch: "https://api.iconify.design/material-symbols/switch.svg",
  light: "https://api.iconify.design/tabler/light-bulb.svg",
  motionsensor: "https://api.iconify.design/cbi/motionsensor.svg",
  mobilepresence: "https://api.iconify.design/tabler/device-mobile.svg",
  remotecontroller: "https://api.iconify.design/ri/remote-control-line.svg",
  fan: "https://api.iconify.design/mdi/fan.svg",
  speaker: "https://api.iconify.design/material-symbols/speaker.svg",
  door: "https://api.iconify.design/ph/door-bold.svg",
  contactsensor: "https://api.iconify.design/cbi/aqara-contact.svg",
  smartplug: "https://api.iconify.design/ic/outline-power.svg",
  hub: "https://api.iconify.design/solar/smart-home-bold.svg",
  temphumiditysensor: "https://api.iconify.design/tabler/temperature-sun.svg",
  airconditioner: "https://api.iconify.design/tabler/air-conditioning-disabled.svg",
  other: "https://api.iconify.design/material-symbols-light/devices-other-rounded.svg",
};

const getIconUrl = (category: DeviceCategory, state?: string, size = 1): string => {
  const color = "white";
  let iconUrl;

  if (!category) {
    iconUrl = ICON_URLS["other"];
  } else {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory === "light") {
      iconUrl = state === "on" ? "https://api.iconify.design/iconoir/light-bulb-on.svg" : ICON_URLS.light;
    } else if (lowerCategory === "airconditioner") {
      iconUrl = state === "on" ? "https://api.iconify.design/tabler/air-conditioning.svg" : ICON_URLS.airconditioner;
    } else {
      const lowerCategoryKey: keyof typeof ICON_URLS = lowerCategory as keyof typeof ICON_URLS;
      iconUrl = ICON_URLS[lowerCategoryKey] || ICON_URLS["other"];
    }
  }

  return `${iconUrl}?size=${size * 100}%&color=${color}`;
};

export default function ControlDevices() {
  const [devices, setDevices] = useState<Record<string, Device[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function fetchDevices() {
    try {
      const preferences = getPreferenceValues();
      const SMARTTHINGS_API_TOKEN = preferences.apiToken;

      const locationsResponse = await axios.get(`https://api.smartthings.com/v1/locations`, {
        headers: {
          Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
        },
      });
      const locationId = locationsResponse.data.items[0]?.locationId;

      if (!locationId) {
        throw new Error("No locations found.");
      }

      const [roomsResponse, devicesResponse] = await Promise.all([
        axios.get(`https://api.smartthings.com/v1/locations/${locationId}/rooms`, {
          headers: {
            Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
          },
        }),
        axios.get(`https://api.smartthings.com/v1/devices`, {
          headers: {
            Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
          },
        }),
      ]);

      const roomsData = roomsResponse.data.items;
      const roomMap = roomsData.reduce(
        (acc, room) => {
          acc[room.roomId] = room.name;
          return acc;
        },
        {} as Record<string, string>,
      );

      let devicesData: Device[] = devicesResponse.data.items;

      const statusPromises = devicesData.map((device) =>
        axios.get(`https://api.smartthings.com/v1/devices/${device.deviceId}/status`, {
          headers: {
            Authorization: `Bearer ${SMARTTHINGS_API_TOKEN}`,
          },
        }),
      );

      const statusResponses = await Promise.all(statusPromises);

      const statusMap = statusResponses.reduce(
        (acc, statusResponse, index) => {
          const deviceId = devicesData[index].deviceId;
          acc[deviceId] = statusResponse.data.components.main;
          return acc;
        },
        {} as Record<string, DeviceComponentStatus>,
      );

      devicesData = devicesData.map((device) => ({
        ...device,
        status: statusMap[device.deviceId],
      }));

      const categorizedDevices = categorizeDevices(devicesData, roomMap);
      setDevices(categorizedDevices);
      setIsLoading(false);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to fetch devices", (error as Error).message);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchDevices();
  }, []);

  const categorizeDevices = (devices: Device[], roomMap: Record<string, string>): Record<string, Device[]> => {
    const categorized: Record<string, Device[]> = {};
    devices.forEach((device: Device) => {
      const roomName = device.roomId ? roomMap[device.roomId] : "No Room";
      if (!(roomName in categorized)) {
        categorized[roomName] = [];
      }
      categorized[roomName].push(device);
    });
    return categorized;
  };

  function SetBrightnessForm({ deviceId }: { deviceId: string }) {
    const { pop } = useNavigation();
    const [level, setLevel] = useState<string>("50");

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Set Brightness"
              onSubmit={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Setting brightness...",
                });
                try {
                  await setLightLevel(deviceId, parseInt(level, 10));
                  toast.style = Toast.Style.Success;
                  toast.title = "Brightness set";
                  pop();
                  fetchDevices();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to set brightness";
                  toast.message = (error as Error).message;
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="level"
          title="Brightness Level"
          placeholder="Enter a value between 0 and 100"
          value={level}
          onChange={setLevel}
        />
      </Form>
    );
  }

  function SetColorForm({ deviceId }: { deviceId: string }) {
    const { pop } = useNavigation();
    const [color, setColor] = useState<string>("#FFFFFF");
    const [error, setError] = useState<string | undefined>();

    function validateColor(value: string) {
      if (!/^#[0-9A-F]{6}$/i.test(value)) {
        setError("Invalid hex color code");
      } else {
        setError(undefined);
      }
      setColor(value);
    }

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Set Color"
              onSubmit={async () => {
                if (error) {
                  return;
                }
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Setting color...",
                });
                try {
                  await setLightColor(deviceId, color);
                  toast.style = Toast.Style.Success;
                  toast.title = "Color set";
                  pop();
                  fetchDevices();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to set color";
                  toast.message = (error as Error).message;
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="color"
          title="Color (Hex)"
          placeholder="Enter a hex color code (e.g., #FF0000)"
          value={color}
          onChange={validateColor}
          error={error}
        />
      </Form>
    );
  }

  function SetTemperatureForm({ deviceId }: { deviceId: string }) {
    const { pop } = useNavigation();
    const [temperature, setTemperature] = useState<string>("20");

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Set Temperature"
              onSubmit={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Setting temperature...",
                });
                try {
                  await apiSetTemperature(deviceId, parseInt(temperature, 10));
                  toast.style = Toast.Style.Success;
                  toast.title = "Temperature set";
                  pop();
                  fetchDevices();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to set temperature";
                  toast.message = (error as Error).message;
                }
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="temperature"
          title="Temperature"
          placeholder="Enter a temperature value"
          value={temperature}
          onChange={setTemperature}
        />
      </Form>
    );
  }

  return (
    <Grid isLoading={isLoading} searchBarPlaceholder="Search devices...">
      {Object.entries(devices).map(([category, categoryDevices]) => (
        <Grid.Section title={category} key={category} subtitle={`${categoryDevices.length} devices`}>
          {categoryDevices.map((device: Device) => {
            const hasColorControl = device.components?.some((c) =>
              c.capabilities?.some((cap) => cap.id === "colorControl"),
            );
            const hasSwitchLevel = device.components?.some((c) =>
              c.capabilities?.some((cap) => cap.id === "switchLevel"),
            );
            const hasThermostatCoolingSetpoint = device.components?.some((c) =>
              c.capabilities?.some((cap) => cap.id === "thermostatCoolingSetpoint"),
            );
            const switchState = device.status?.switch?.switch?.value;
            return (
              <Grid.Item
                key={device.deviceId}
                content={{
                  value: getIconUrl(device.components?.[0]?.categories?.[0]?.name as DeviceCategory, switchState),
                  tooltip: device.label,
                }}
                title={device.label}
                subtitle={device.components?.[0]?.categories?.[0]?.name}
                actions={
                  <ActionPanel>
                    <Action
                      title="Toggle Device"
                      icon={Icon.Power}
                      onAction={async () => {
                        const toast = await showToast({
                          style: Toast.Style.Animated,
                          title: "Toggling device...",
                        });
                        try {
                          await toggleDevice(device.deviceId);
                          toast.style = Toast.Style.Success;
                          toast.title = "Device toggled";
                          fetchDevices();
                        } catch (error) {
                          toast.style = Toast.Style.Failure;
                          toast.title = "Failed to toggle device";
                          toast.message = (error as Error).message;
                        }
                      }}
                    />
                    {hasSwitchLevel && (
                      <Action
                        title="Set Brightness"
                        icon={Icon.Sun}
                        onAction={() => push(<SetBrightnessForm deviceId={device.deviceId} />)}
                      />
                    )}
                    {hasColorControl && (
                      <Action
                        title="Set Color"
                        icon={Icon.Droplets}
                        onAction={() => push(<SetColorForm deviceId={device.deviceId} />)}
                      />
                    )}
                    {hasThermostatCoolingSetpoint && (
                      <Action
                        title="Set Temperature"
                        icon={Icon.Temperature}
                        onAction={() => push(<SetTemperatureForm deviceId={device.deviceId} />)}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      ))}
    </Grid>
  );
}
