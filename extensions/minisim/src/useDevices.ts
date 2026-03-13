import { useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";

import { sortDevices } from "./utils";
import { getCommands, getDevices } from "./actions";
import { Command, Device, DeviceType, Platform } from "./types";

const useDevices = (platform: Platform, deviceType: DeviceType) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchDevices = async () => {
      const localStorageKey = `${platform}-${deviceType}`;

      const cached = await LocalStorage.getItem(localStorageKey);
      const { devices: cachedDevices, commands: cachedCommands } =
        typeof cached === "string" ? JSON.parse(cached) : { commands: [], devices: [] };

      if (cachedDevices && cachedCommands) {
        setDevices(cachedDevices);
        setCommands(cachedCommands);
      }
      const [newDevices, newCommands] = await Promise.all([
        getDevices(platform, deviceType),
        getCommands(platform, deviceType),
      ]);

      setDevices(newDevices?.sort(sortDevices));
      setCommands(newCommands);
      LocalStorage.setItem(localStorageKey, JSON.stringify({ devices: newDevices, commands: newCommands }));
    };

    fetchDevices().catch((e) => {
      console.error(e);
      setIsError(true);
    });
  }, [platform, deviceType]);

  return { devices, commands, isError };
};

export default useDevices;
