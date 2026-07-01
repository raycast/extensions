import { getPreferenceValues } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useEffect, useState } from "react";
import type tinycolor from "tinycolor2";
import { getDeviceInfo, getEffects, pair, setBrightness, setColor, setEffect, setPower } from "../lib/nanoleaf-client";
import { DeviceInfo } from "../types";

export function useDeviceApi() {
  const { deviceAddress: deviceAddressFromPreferences, maintainBrightnessOnColorChange } =
    getPreferenceValues<ExtensionPreferences>();

  const [deviceAddress, setDeviceAddress] = useCachedState<string>(
    "device-address",
    deviceAddressFromPreferences ?? "",
  );
  const [deviceToken, setDeviceToken] = useCachedState<string>("device-token", "");
  const [deviceMetadata, setDeviceMetadata] = useCachedState<DeviceInfo | null>("device-metadata", null);
  const [isConnecting, setIsConnecting] = useState<boolean>(true);

  useEffect(() => {
    if (!deviceToken) {
      setIsConnecting(false);
      return;
    }
    refreshMetadata();
  }, [deviceToken]);

  async function refreshMetadata() {
    try {
      const info = await getDeviceInfo();
      setDeviceMetadata(info);
    } catch (error) {
      console.error("Failed to refresh device metadata", error);
    } finally {
      setIsConnecting(false);
    }
  }

  async function pairDevice(): Promise<void> {
    const token = await pair();
    setDeviceToken(token);
  }

  async function setDeviceBrightness(brightness: number): Promise<void> {
    await setBrightness(brightness);
    refreshMetadata();
  }

  async function setDeviceColor(color: tinycolor.ColorFormats.HSV): Promise<void> {
    const hue = Math.round(color.h);
    const saturation = Math.min(Math.max(Math.round(color.s * 100), 0), 100);
    const brightness = maintainBrightnessOnColorChange
      ? undefined
      : Math.min(Math.max(Math.round(color.v * 100), 0), 100);
    await setColor(hue, saturation, brightness);
    refreshMetadata();
  }

  async function turnOnDevice(): Promise<void> {
    await setPower(true);
    refreshMetadata();
  }

  async function turnOffDevice(): Promise<void> {
    await setPower(false);
    refreshMetadata();
  }

  async function getDeviceEffects(): Promise<string[]> {
    return getEffects();
  }

  async function updateDeviceEffect(effect: string): Promise<void> {
    await setEffect(effect);
    refreshMetadata();
  }

  return {
    deviceAddress,
    deviceMetadata,
    deviceToken,
    getDeviceEffects,
    isConnecting,
    pairDevice,
    setDeviceAddress,
    setDeviceBrightness,
    setDeviceColor,
    turnOffDevice,
    turnOnDevice,
    updateDeviceEffect,
  };
}
