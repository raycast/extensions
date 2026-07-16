import { Action, ActionPanel, Cache, closeMainWindow, Color, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Seam } from "seam";
import { useState, useEffect } from "react";
import { Device, DeviceStatus, fetchDevices, loadSeam } from "./seam";

let seam: Seam;
const CACHE_TIMEOUT_MS = 60 * 1000; // Cache valid for 1 minute
const DEFAULT_TEMPERATURE_F = 76; // Default thermostat temperature in Fahrenheit
const MIN_TEMPERATURE_F = 50;
const MAX_TEMPERATURE_F = 90;
const cache = new Cache();

function getNumberFromCache(key: string, defaultValue: number) {
  const cachedValue = cache.get(key);
  if (cachedValue) {
    const parsed = parseInt(cachedValue, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

function getCachedDevices() {
  const cachedDevicesString = cache.get("devices");
  if (!cachedDevicesString) {
    return [];
  }

  try {
    const parsedDevices = JSON.parse(cachedDevicesString) as Device[];
    return Array.isArray(parsedDevices) ? parsedDevices : [];
  } catch {
    return [];
  }
}

type ModeListProps = {
  deviceId: string;
  devices: Device[];
  setDevices: (devices: Device[]) => void;
  seam: Seam;
};
// Create a proper component for the mode list that shares state
const ModeList = ({ deviceId, devices, setDevices, seam }: ModeListProps) => {
  // Local temperature state for this component
  const [localTemperature, setLocalTemperature] = useState(DEFAULT_TEMPERATURE_F);

  const sendThermostatCommand = async (targetStatus: DeviceStatus) => {
    closeMainWindow();
    try {
      const newDevices = devices.map((device) =>
        device.id === deviceId ? { ...device, status: targetStatus } : device,
      );
      if (targetStatus === DeviceStatus.COOL) {
        await seam.thermostats.cool({
          device_id: deviceId,
          cooling_set_point_fahrenheit: localTemperature,
        });
      } else if (targetStatus === DeviceStatus.HEAT) {
        await seam.thermostats.heat({
          device_id: deviceId,
          heating_set_point_fahrenheit: localTemperature,
        });
      } else {
        await seam.thermostats.off({
          device_id: deviceId,
        });
      }
      cache.set("devices", JSON.stringify(newDevices));
      setDevices(newDevices);
      await showToast({
        style: Toast.Style.Success,
        title: targetStatus === DeviceStatus.OFF ? "Thermostat turned off" : `${targetStatus} to ${localTemperature}°F`,
      });
    } catch (error: unknown) {
      await showFailureToast(error, { title: "Failed to send thermostat command" });
    }
  };

  const actions = (targetStatus: DeviceStatus) => (
    <ActionPanel title="Thermostat Controls">
      <Action title="Send Command" onAction={() => sendThermostatCommand(targetStatus)} />
      {localTemperature > MIN_TEMPERATURE_F ? (
        <Action
          title={`Lower Temperature (${localTemperature - 1}°F)`}
          shortcut={{ modifiers: [], key: "[" }}
          onAction={() => setLocalTemperature((prev) => Math.max(MIN_TEMPERATURE_F, prev - 1))}
        />
      ) : null}
      {localTemperature < MAX_TEMPERATURE_F ? (
        <Action
          title={`Raise Temperature (${localTemperature + 1}°F)`}
          shortcut={{ modifiers: [], key: "]" }}
          onAction={() => setLocalTemperature((prev) => Math.min(MAX_TEMPERATURE_F, prev + 1))}
        />
      ) : null}
    </ActionPanel>
  );

  return (
    <List>
      <List.Item title="Cool" subtitle={`Cool to ${localTemperature}°F`} actions={actions(DeviceStatus.COOL)} />
      <List.Item title="Heat" subtitle={`Heat to ${localTemperature}°F`} actions={actions(DeviceStatus.HEAT)} />
      <List.Item
        title="Off"
        subtitle="Turn off thermostat"
        actions={
          <ActionPanel title="Thermostat Controls">
            <Action title="Send Command" onAction={() => sendThermostatCommand(DeviceStatus.OFF)} />
          </ActionPanel>
        }
      />
    </List>
  );
};

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  // Fetch devices on command mount (wrapper enables async)
  useEffect(() => {
    async function main() {
      // No use checking device cache if Seam api is not loaded
      const [possibleSeam, error1] = await loadSeam();
      if (error1 !== "") {
        setError(error1);
        await showFailureToast(error1, { title: "Invalid Seam API key" });
        setIsLoading(false);
        return;
      }
      seam = possibleSeam!;

      const lastFetch = getNumberFromCache("last_fetch", 0);
      const cachedDevices = getCachedDevices();
      if (Date.now() - lastFetch < CACHE_TIMEOUT_MS && cachedDevices.length > 0) {
        setDevices(cachedDevices);
        setIsLoading(false);
        return;
      }

      // Fetch devices from SEAM API if cache fails
      const [newDevices, error2] = await fetchDevices(seam);
      if (error2 !== "") {
        if (cachedDevices.length > 0) {
          setDevices(cachedDevices);
          await showFailureToast(error2, { title: "Showing cached thermostats" });
        } else {
          setError(error2);
          await showFailureToast(error2, { title: "Failed to fetch thermostats" });
        }
      } else {
        cache.set("last_fetch", Date.now().toString());
        setDevices(newDevices);
        cache.set("devices", JSON.stringify(newDevices));
      }
      setIsLoading(false);
    }

    // Ideally, devices should be avaiable now.
    main();
  }, []);

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  return (
    <List isLoading={isLoading}>
      {[...devices]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(({ id, name, status, temperatureFahrenheit }) => (
          <List.Item
            key={id}
            title={name}
            subtitle={`${status} (${temperatureFahrenheit}°F)`}
            actions={
              <ActionPanel title="">
                <Action.Push
                  title="See Actions"
                  target={<ModeList deviceId={id} devices={devices} setDevices={setDevices} seam={seam} />}
                />
              </ActionPanel>
            }
            icon={{
              source: Icon.Circle,
              tintColor:
                status === DeviceStatus.HEAT
                  ? Color.Red
                  : status === DeviceStatus.COOL
                    ? Color.Blue
                    : Color.SecondaryText,
            }}
          />
        ))}
    </List>
  );
}
