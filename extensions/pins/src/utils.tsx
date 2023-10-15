import { useEffect, useState } from "react";
import { LocalStorage, Icon, Clipboard } from "@raycast/api";
import { exec, execSync } from "child_process";
import { StorageKey } from "./constants";
import { Pin, Group } from "./types";

export const iconMap: { [index: string]: Icon } = Icon;

export const setStorage = async (key: string, value: unknown) => {
  // Set the value of a local storage key
  await LocalStorage.setItem(key, JSON.stringify(value));
};

export const getStorage = async (key: string) => {
  // Get the value of a local storage key
  const localStorage = await LocalStorage.getItem<string>(key);
  const storageString = typeof localStorage === "undefined" ? "" : localStorage;
  return storageString == "" ? [] : JSON.parse(storageString);
};

export const runCommand = async (command: string, callback?: (arg0: string) => unknown) => {
  // Run terminal command asynchronously
  const child = exec(command);
  let result = "";

  child.stdout?.on("data", (data: string) => {
    result = result + data;
    callback?.(result);
  });
};

export const runCommandSync = (command: string) => {
  // Run terminal command synchronously
  const result = execSync(command);
  return result.toString();
};

export const useGroups = () => {
  const [groups, setGroups] = useState<Group[]>();

  useEffect(() => {
    Promise.resolve(getStorage(StorageKey.LOCAL_GROUPS)).then((storedGroups) => {
      setGroups(storedGroups);
    });
  }, []);

  return [groups, setGroups];
};

export const usePins = () => {
  const [pins, setPins] = useState<Pin[]>();

  useEffect(() => {
    Promise.resolve(getStorage(StorageKey.LOCAL_PINS)).then((storedPins) => {
      setPins(storedPins);
    });
  }, []);

  return [pins, setPins];
};

export const copyPinData = async () => {
  const pins = await getStorage(StorageKey.LOCAL_PINS);
  const groups = await getStorage(StorageKey.LOCAL_GROUPS);

  const data = {
    groups: groups,
    pins: pins,
  };

  const jsonData = JSON.stringify(data);
  await Clipboard.copy(jsonData);
  return jsonData;
};
