/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Action, ActionPanel, List, showToast, Toast, closeMainWindow, Detail, Cache, Icon, Color } from "@raycast/api";
import { Seam } from "seam";
import { useState, useEffect } from "react";
import { Device, DeviceStatus, fetchDevices, loadSeam } from "./seam";

let seam: Seam;
const USE_CACHE = true;
const CACHE_TIMEOUT_MS = 60 * 1000; // Cache valid for 1 minute
const DEFAULT_TEMPERATURE_F = 76; // Default thermostat temperature in Fahrenheit
const cache = new Cache();

function getNumberFromCache(key: string, defaultValue: number) {
  const cachedValue = cache.get(key);
  if (cachedValue) {
    const parsed = parseInt(cachedValue, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

export default function Command() {
  // Cache by default, set to 'api' if fetching
  const [deviceSource, setDeviceSource] = useState<"cache" | "api">("cache");
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
        setIsLoading(false);
        return;
      }
      seam = possibleSeam!;
      console.debug("Seam loaded successfully");

      const lastFetch = getNumberFromCache("last_fetch", 0);
      if (!USE_CACHE) {
        console.debug("Cache disabled, erasing devices cache");
        cache.set("devices", JSON.stringify([]));
      } else if (Date.now() - lastFetch < CACHE_TIMEOUT_MS) {
        const cachedDevicesString = cache.get("devices");
        console.debug("Cache:", cachedDevicesString);
        if (cachedDevicesString) {
          const cachedDevices = JSON.parse(cachedDevicesString) as Device[];
          if (cachedDevices.length > 0) {
            setDevices(cachedDevices);
            cache.set("devices", JSON.stringify(cachedDevices));
            setIsLoading(false);
            return;
          }
        }
      }

      // Fetch devices from SEAM API if cache fails
      const [newDevices, error2] = await fetchDevices(seam);
      if (error2 !== "") {
        setError(error2);
      } else {
        cache.set("last_fetch", Date.now().toString());
        setDevices(newDevices);
        setDeviceSource("api");
        cache.set("devices", JSON.stringify(newDevices));
        console.debug("Fetched devices:", newDevices);
      }
      setIsLoading(false);
    }

    // Ideally, devices should be avaiable now.
    main();
  }, []);

  // Create a proper component for the mode list that shares state
  const ModeList = ({ deviceId }: { deviceId: string }) => {
    // Local temperature state for this component
    const [localTemperature, setLocalTemperature] = useState(DEFAULT_TEMPERATURE_F);
    const [localCool, setLocalCool] = useState("Cool to " + DEFAULT_TEMPERATURE_F);
    const [localHeat, setLocalHeat] = useState("Heat to " + DEFAULT_TEMPERATURE_F);

    // Update display strings when temperature changes
    useEffect(() => {
      setLocalCool(`Cool to ${localTemperature}°F`);
      setLocalHeat(`Heat to ${localTemperature}°F`);
    }, [localTemperature]);

    const sendThermostatCommand = async (targetStatus: DeviceStatus) => {
      closeMainWindow();
      try {
        console.debug("Attempting device action", targetStatus, localTemperature);
        const newDevices = devices.map((d) => (d[0] === deviceId ? ([d[0], d[1], targetStatus, d[3]] as Device) : d));
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
          title:
            targetStatus === DeviceStatus.OFF ? "Thermostat turned off" : `${targetStatus} to ${localTemperature}°F`,
        });
      } catch (error: any) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Failed to send thermostat command: " + (error.message || "Unknown error"),
        });
      }
    };

    const actions = (targetStatus: DeviceStatus) => (
      <ActionPanel title="Thermostat Controls">
        <Action title="Send Command" onAction={() => sendThermostatCommand(targetStatus)} />
        <Action
          title={`Lower Temperature (${localTemperature - 1}°F)`}
          shortcut={{ modifiers: [], key: "[" }}
          onAction={() => setLocalTemperature((prev) => prev - 1)}
        />
        <Action
          title={`Raise Temperature (${localTemperature + 1}°F)`}
          shortcut={{ modifiers: [], key: "]" }}
          onAction={() => setLocalTemperature((prev) => prev + 1)}
        />
      </ActionPanel>
    );

    return (
      <List>
        <List.Item title="Cool" subtitle={localCool} actions={actions(DeviceStatus.COOL)} />
        <List.Item title="Heat" subtitle={localHeat} actions={actions(DeviceStatus.HEAT)} />
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

  if (error) {
    return <Detail markdown={`# Error\n\n${error}`} />;
  }

  return (
    <List isLoading={isLoading}>
      {devices
        ?.sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name, subtitle, temperature]) => (
          <List.Item
            key={id}
            title={name}
            subtitle={subtitle + ` (${temperature}°F)`}
            actions={
              <ActionPanel title="">
                <Action.Push title="See Actions" target={<ModeList deviceId={id} />} />
                <Action
                  title="Confirm Source"
                  onAction={() => showToast({ title: "Data loaded from " + deviceSource })}
                />
              </ActionPanel>
            }
            icon={{
              source: Icon.Circle,
              tintColor:
                subtitle === DeviceStatus.HEAT
                  ? Color.Red
                  : subtitle === DeviceStatus.COOL
                    ? Color.Blue
                    : Color.SecondaryText,
            }}
          />
        ))}
    </List>
  );
}
