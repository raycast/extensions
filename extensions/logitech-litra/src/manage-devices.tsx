import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { getCliDirectory } from "./preferences";
import { getDevices, turnOff, turnOn, setTemperatureInKelvin, setBrightnessPercentage } from "./utils";
import { getEnabledTemperaturePresets } from "./temperature-presets";
import { getEnabledBrightnessPresets } from "./brightness-presets";

interface Device {
  name: string;
  serial_number: string;
}

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [enabledTemperaturePresets, setEnabledTemperaturePresets] = useState<Set<number>>(new Set());
  const [enabledBrightnessPresets, setEnabledBrightnessPresets] = useState<Set<number>>(new Set());

  const cliDirectory = getCliDirectory();

  useEffect(() => {
    (async () => {
      const devices = await getDevices(cliDirectory);
      setDevices(devices);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const enabledTemperaturePresets = await getEnabledTemperaturePresets();
      setEnabledTemperaturePresets(enabledTemperaturePresets);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const enabledBrightnessPresets = await getEnabledBrightnessPresets();
      setEnabledBrightnessPresets(enabledBrightnessPresets);
    })();
  }, []);

  console.log({ enabledTemperaturePresets, enabledBrightnessPresets });

  return (
    <List isLoading={false}>
      {devices.map((device) => (
        <List.Item
          key={device.serial_number}
          title={device.name}
          subtitle={device.serial_number}
          actions={
            <ActionPanel>
              <Action
                title="Turn On"
                icon={Icon.LightBulb}
                onAction={async () => {
                  await turnOn(cliDirectory, device.serial_number);
                  await showToast({ title: `Turned on ${device.name}`, style: Toast.Style.Success });
                }}
              />
              <Action
                title="Turn Off"
                icon={Icon.LightBulbOff}
                onAction={async () => {
                  await turnOff(cliDirectory, device.serial_number);
                  await showToast({ title: `Turned off ${device.name}`, style: Toast.Style.Success });
                }}
              />
              {Array.from(enabledTemperaturePresets).map((temperature) => (
                <Action
                  key={temperature}
                  title={`Set Temperature to ${temperature}K`}
                  icon={Icon.Temperature}
                  onAction={async () => {
                    await setTemperatureInKelvin(cliDirectory, device.serial_number, temperature);
                    await showToast({
                      title: `Set ${device.name}'s temperature to ${temperature}K`,
                      style: Toast.Style.Success,
                    });
                  }}
                />
              ))}
              {Array.from(enabledBrightnessPresets).map((brightness) => (
                <Action
                  key={brightness}
                  title={`Set Brightness to ${brightness}%`}
                  icon={Icon.CircleProgress100}
                  onAction={async () => {
                    await setBrightnessPercentage(cliDirectory, device.serial_number, brightness);
                    await showToast({
                      title: `Set ${device.name}'s brightness to ${brightness}%`,
                      style: Toast.Style.Success,
                    });
                  }}
                />
              ))}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
