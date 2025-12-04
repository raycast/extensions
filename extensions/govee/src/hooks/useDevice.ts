import type { Device, DeviceState, DeviceStateInfo } from "@j3lte/govee-lan-controller";
import { GoveeDeviceEventTypes } from "@j3lte/govee-lan-controller";
import { useCallback, useEffect, useRef, useState } from "react";

const useDevice = (device: Device) => {
  const deviceRef = useRef<Device>(device);

  const [onOff, setOnOff] = useState<boolean>(false);
  const [brightness, setBrightnessValue] = useState<number>(0);
  const [color, setColorValue] = useState<{ r: number; g: number; b: number }>({ r: 0, g: 0, b: 0 });
  const [ipAddr, setIpAddr] = useState<string>(device.ipAddr);

  const turnOn = useCallback(() => {
    const updatePromise = async () => {
      await deviceRef.current.turnOn();
      await deviceRef.current.sync();
      setOnOff(true);
    };
    updatePromise();
  }, [deviceRef.current, setOnOff]);

  const turnOff = useCallback(() => {
    const updatePromise = async () => {
      await deviceRef.current.turnOff();
      await deviceRef.current.sync();
      setOnOff(false);
    };
    updatePromise();
  }, [deviceRef.current, setOnOff]);

  const toggle = useCallback(() => {
    if (onOff) {
      turnOff();
    } else {
      turnOn();
    }
  }, [onOff, turnOn, turnOff]);

  const setBrightness = useCallback(
    (brightness: number) => {
      const updatePromise = async () => {
        await deviceRef.current.setBrightness(brightness);
        await deviceRef.current.sync();
        setBrightnessValue(brightness);
      };
      updatePromise();
    },
    [deviceRef.current, setBrightnessValue],
  );

  const setColor = useCallback(
    (color: { r: number; g: number; b: number }) => {
      const updatePromise = async () => {
        await deviceRef.current.setColor(color);
        await deviceRef.current.sync();
        setColorValue(color);
      };
      updatePromise();
    },
    [deviceRef.current, setColorValue],
  );

  useEffect(() => {
    const device = deviceRef.current;

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
      device.destroy();
    };
  }, []);

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
