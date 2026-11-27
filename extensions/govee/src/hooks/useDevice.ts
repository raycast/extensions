import type { Device, DeviceState, DeviceStateInfo } from "@j3lte/govee-lan-controller";
import { GoveeDeviceEventTypes } from "@j3lte/govee-lan-controller";
import { useCallback, useEffect, useRef, useState } from "react";

import { showFailureToast } from "@raycast/utils";

const useDevice = (device: Device) => {
  const deviceRef = useRef<Device>(device);
  // A light can switch from its cloud copy to LAN while listed; follow it without a new row.
  deviceRef.current = device;

  const [onOff, setOnOff] = useState<boolean>(false);
  const [brightness, setBrightnessValue] = useState<number>(0);
  const [color, setColorValue] = useState<{ r: number; g: number; b: number }>({ r: 0, g: 0, b: 0 });
  const [ipAddr, setIpAddr] = useState<string>(device.ipAddr);

  const turnOn = useCallback(() => {
    const updatePromise = async () => {
      await deviceRef.current.turnOn();
      setOnOff(true);
    };
    updatePromise().catch((err) => showFailureToast(err));
  }, [deviceRef.current, setOnOff]);

  const turnOff = useCallback(() => {
    const updatePromise = async () => {
      await deviceRef.current.turnOff();
      setOnOff(false);
    };
    updatePromise().catch((err) => showFailureToast(err));
  }, [deviceRef.current, setOnOff]);

  const toggle = useCallback(() => {
    const dev = deviceRef.current as unknown as { isCloud?: boolean; refresh?: () => Promise<void>; isOn: boolean };
    if (!dev.isCloud || !dev.refresh) {
      // LAN lights report their state every 2 s, so the known state is current.
      if (onOff) turnOff();
      else turnOn();
      return;
    }
    // Cloud lights are only read when the list opens; ask first so a light switched from
    // elsewhere (Govee app, Stream Deck) toggles the right way. If the read fails, use what we know.
    dev
      .refresh()
      .catch(() => undefined)
      .then(() => (dev.isOn ? turnOff() : turnOn()));
  }, [onOff, turnOn, turnOff]);

  const setBrightness = useCallback(
    (brightness: number) => {
      const updatePromise = async () => {
        await deviceRef.current.setBrightness(brightness);
        setBrightnessValue(brightness);
      };
      updatePromise().catch((err) => showFailureToast(err));
    },
    [deviceRef.current, setBrightnessValue],
  );

  const setColor = useCallback(
    (color: { r: number; g: number; b: number }) => {
      const updatePromise = async () => {
        await deviceRef.current.setColor(color);
        setColorValue(color);
      };
      updatePromise().catch((err) => showFailureToast(err));
    },
    [deviceRef.current, setColorValue],
  );

  useEffect(() => {
    setIpAddr(device.ipAddr);

    const updateState = (state?: DeviceState & DeviceStateInfo) => {
      const onOff = state?.onOff ?? device.isOn;
      const brightness = state?.brightness ?? device.brightness;
      const color = state?.color ?? device.color;
      setOnOff(typeof onOff === "boolean" ? onOff : onOff === 1);
      setBrightnessValue(brightness);
      setColorValue(color);
    };

    const ipChange = (ip: string) => {
      setIpAddr(ip);
    };

    updateState();

    device.on(GoveeDeviceEventTypes.StateChange, updateState);
    device.on(GoveeDeviceEventTypes.IpChange, ipChange);

    return () => {
      device.off(GoveeDeviceEventTypes.StateChange, updateState);
      device.off(GoveeDeviceEventTypes.IpChange, ipChange);
      // No device.destroy(): devices belong to the shared controller and outlive this list item.
    };
  }, [device]);

  return {
    dev: deviceRef.current,
    ipAddr,
    state: {
      onOff,
      brightness,
      color,
    },
    actions: {
      toggle,
      turnOn,
      turnOff,
      setBrightness,
      setColor,
    },
  };
};

export default useDevice;
