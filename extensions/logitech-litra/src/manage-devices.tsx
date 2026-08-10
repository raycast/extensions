import { ActionPanel, Action, Icon, List, showToast, Toast, open } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { getLitraBinaryPath } from "./preferences";
import {
  getDevices,
  toggle,
  isOn,
  setTemperatureInKelvin,
  setBrightnessPercentage,
  checkLitraVersion,
  toggleBack,
  setBackBrightnessPercentage,
  setBackColor,
  getLitraVersion,
  isVersionV2,
} from "./utils";
import { getEnabledTemperaturePresets } from "./temperature-presets";
import { getEnabledBrightnessPresets } from "./brightness-presets";
import { Device } from "./types";

export default function Command() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [enabledTemperaturePresets, setEnabledTemperaturePresets] = useState<Set<number>>(new Set());
  const [enabledBrightnessPresets, setEnabledBrightnessPresets] = useState<Set<number>>(new Set());
  const [isV2, setIsV2] = useState<boolean>(false);

  const litraBinaryPath = getLitraBinaryPath();

  const getDeviceAccessories = (device: Device): List.Item.Accessory[] => {
    const frontStatus = device.is_on ? "On" : "Off";
    const frontText = `${frontStatus} / ${device.brightness_in_lumen}lm / ${device.temperature_in_kelvin}K`;

    if (device.has_back_side && device.is_back_on !== null && device.back_brightness_percentage !== null) {
      const backStatus = device.is_back_on ? "On" : "Off";
      return [{ tag: `Front: ${frontText}` }, { tag: `Back: ${backStatus} / ${device.back_brightness_percentage}%` }];
    }

    return [{ tag: frontText }];
  };

  const refreshDevices = async () => {
    await checkLitraVersion(litraBinaryPath);

    // Check if using v2
    const version = await getLitraVersion(litraBinaryPath);
    const isV2Version = isVersionV2(version);
    setIsV2(isV2Version);

    if (!isLoading) setIsLoading(true);
    const devices = await getDevices(litraBinaryPath);
    setDevices(devices);
    setIsLoading(false);

    // Check if we should show upgrade notification
    if (isV2Version) {
      const hasBeamLXDevice = devices.some((device) => device.has_back_side);
      if (hasBeamLXDevice) {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "litra CLI update available",
          message: "Update the litra CLI to control your Litra Beam LX's back light",
          primaryAction: {
            title: "Learn More",
            onAction: () => {
              open("https://github.com/timrogers/litra-rs");
              toast.hide();
            },
          },
        });
      }
    }
  };

  useEffect(() => {
    refreshDevices();
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
    <List isLoading={isLoading}>
      {devices.length
        ? devices.map((device) => (
            <List.Item
              key={device.device_path}
              title={device.device_type_display}
              accessories={getDeviceAccessories(device)}
              actions={
                <ActionPanel>
                  <Action
                    title="Toggle"
                    icon={Icon.LightBulb}
                    onAction={async () => {
                      await toggle(device.device_path, litraBinaryPath);
                      const isDeviceOn = await isOn(device.device_path, litraBinaryPath);

                      if (isDeviceOn) {
                        await showToast({
                          title: `Turned on ${device.device_type_display}`,
                          style: Toast.Style.Success,
                        });
                      } else {
                        await showToast({
                          title: `Turned off ${device.device_type_display}`,
                          style: Toast.Style.Success,
                        });
                      }

                      refreshDevices();
                    }}
                  />
                  {Array.from(enabledTemperaturePresets).map((temperature) => (
                    <Action
                      key={temperature}
                      title={`Set Temperature to ${temperature}K`}
                      icon={Icon.Temperature}
                      onAction={async () => {
                        await setTemperatureInKelvin(device.device_path, temperature, litraBinaryPath);
                        await showToast({
                          title: `Set ${device.device_type_display}'s temperature to ${temperature}K`,
                          style: Toast.Style.Success,
                        });

                        refreshDevices();
                      }}
                    />
                  ))}
                  {Array.from(enabledBrightnessPresets).map((brightness) => (
                    <Action
                      key={brightness}
                      title={`Set Brightness to ${brightness}%`}
                      icon={Icon.CircleProgress100}
                      onAction={async () => {
                        await setBrightnessPercentage(device.device_path, brightness, litraBinaryPath);
                        await showToast({
                          title: `Set ${device.device_type_display}'s brightness to ${brightness}%`,
                          style: Toast.Style.Success,
                        });

                        refreshDevices();
                      }}
                    />
                  ))}
                  {device.has_back_side && !isV2 && (
                    <>
                      <Action
                        title="Toggle Back Light"
                        icon={Icon.Stars}
                        onAction={async () => {
                          await toggleBack(device.device_path, litraBinaryPath);
                          await showToast({
                            title: `Toggled ${device.device_type_display}'s back light`,
                            style: Toast.Style.Success,
                          });

                          refreshDevices();
                        }}
                      />
                      {Array.from(enabledBrightnessPresets).map((brightness) => (
                        <Action
                          key={`back-${brightness}`}
                          title={`Set Back Light Brightness to ${brightness}%`}
                          icon={Icon.CircleProgress100}
                          onAction={async () => {
                            await setBackBrightnessPercentage(device.device_path, brightness, litraBinaryPath);
                            await showToast({
                              title: `Set ${device.device_type_display}'s back light brightness to ${brightness}%`,
                              style: Toast.Style.Success,
                            });

                            refreshDevices();
                          }}
                        />
                      ))}
                      {["white", "red", "green", "blue", "yellow", "cyan", "magenta"].map((color) => (
                        <Action
                          key={`color-${color}`}
                          title={`Set Back Light Color to ${color.charAt(0).toUpperCase() + color.slice(1)}`}
                          icon={Icon.Brush}
                          onAction={async () => {
                            await setBackColor(device.device_path, color, litraBinaryPath);
                            await showToast({
                              title: `Set ${device.device_type_display}'s back light color to ${color}`,
                              style: Toast.Style.Success,
                            });

                            refreshDevices();
                          }}
                        />
                      ))}
                    </>
                  )}
                </ActionPanel>
              }
            />
          ))
        : !isLoading && (
            <List.EmptyView
              icon={Icon.ExclamationMark}
              title="No devices found"
              description="You don't seem to have any USB-connected Litra Glow, Litra Beam or Litra Beam LX devices."
            />
          )}
    </List>
  );
}
