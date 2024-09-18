import { useEffect, useState } from "react";
import { Command, Device, Platform } from "./types";
import { getCommands, getDevices } from "./actions";
import { sortDevices } from "./utils";
import { LocalStorage } from "@raycast/api";

const useDevices = (platform: Platform) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const fetchDevices = async () => {
      const cached = await LocalStorage.getItem(platform);
      const { devices: cachedDevices, commands: cachedCommands } =
        typeof cached === "string" ? JSON.parse(cached) : { commands: [], devices: [] };

      if (cachedDevices && cachedCommands) {
        setDevices(cachedDevices);
        setCommands(cachedCommands);
      }
      const [newDevices, newCommands] = await Promise.all([getDevices(platform), getCommands(platform)]);

      setDevices(newDevices?.sort(sortDevices));
      setCommands(newCommands);
      LocalStorage.setItem(platform, JSON.stringify({ devices: newDevices, commands: newCommands }));
    };

    fetchDevices().catch((e) => {
      console.error(e);
      setIsError(true);
    });
  }, []);

  return { devices, commands, isError };
};

export default useDevices;
