import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { getLitraBinaryPath } from "./preferences";
import { getDevices, toggle, isOn, setTemperatureInKelvin, setBrightnessPercentage, checkLitraVersion } from "./utils";
import { getEnabledTemperaturePresets } from "./temperature-presets";
import { getEnabledBrightnessPresets } from "./brightness-presets";
import { Device } from "./types";

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [enabledTemperaturePresets, setEnabledTemperaturePresets] = useState<Set<number>>(new Set());
  const [enabledBrightnessPresets, setEnabledBrightnessPresets] = useState<Set<number>>(new Set());

  const litraBinaryPath = getLitraBinaryPath();

  useEffect(() => {
    (async () => {
      await checkLitraVersion(litraBinaryPath);

      const devices = await getDevices(litraBinaryPath);
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

  return (
    <List isLoading={false}>
      {devices.length ? (
        devices.map((device) => (
          <List.Item
            key={device.serial_number}
            title={device.device_type}
            subtitle={device.serial_number}
            actions={
              <ActionPanel>
                <Action
                  title="Toggle"
                  icon={Icon.LightBulb}
                  onAction={async () => {
                    await toggle(device.serial_number, litraBinaryPath);
                    const isDeviceOn = await isOn(device.serial_number, litraBinaryPath);

                    if (isDeviceOn) {
                      await showToast({ title: `Turned on ${device.device_type}`, style: Toast.Style.Success });
                    } else {
                      await showToast({ title: `Turned off ${device.device_type}`, style: Toast.Style.Success });
                    }
                  }}
                />
                {Array.from(enabledTemperaturePresets).map((temperature) => (
                  <Action
                    key={temperature}
                    title={`Set Temperature to ${temperature}K`}
                    icon={Icon.Temperature}
                    onAction={async () => {
                      await setTemperatureInKelvin(device.serial_number, temperature, litraBinaryPath);
                      await showToast({
                        title: `Set ${device.device_type}'s temperature to ${temperature}K`,
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
                      await setBrightnessPercentage(device.serial_number, brightness, litraBinaryPath);
                      await showToast({
                        title: `Set ${device.device_type}'s brightness to ${brightness}%`,
                        style: Toast.Style.Success,
                      });
                    }}
                  />
                ))}
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No devices found"
          description="You don't seem to have any USB-connected Litra Glow or Litra Beam devices."
        />
      )}
    </List>
  );
}
