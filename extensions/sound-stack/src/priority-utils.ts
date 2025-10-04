import { LocalStorage } from "@raycast/api";
import { AudioDevice } from "./audio-device";

const OUTPUT_PRIORITY_KEY = "outputPriorityList";
const INPUT_PRIORITY_KEY = "inputPriorityList";
const OUTPUT_DEVICE_INFO_KEY = "outputDeviceInfo";
const INPUT_DEVICE_INFO_KEY = "inputDeviceInfo";
const OUTPUT_PRIORITY_DIRTY_KEY = "outputPriorityDirty";
const INPUT_PRIORITY_DIRTY_KEY = "inputPriorityDirty";

type StoredDeviceInfo = {
  name: string;
  transportType: string;
};

export async function getOutputPriorityList(): Promise<string[]> {
  try {
    const stored = await LocalStorage.getItem<string>(OUTPUT_PRIORITY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.log("Failed to parse output priority list, resetting:", error);
    await LocalStorage.removeItem(OUTPUT_PRIORITY_KEY);
    return [];
  }
}

export async function getInputPriorityList(): Promise<string[]> {
  try {
    const stored = await LocalStorage.getItem<string>(INPUT_PRIORITY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.log("Failed to parse input priority list, resetting:", error);
    await LocalStorage.removeItem(INPUT_PRIORITY_KEY);
    return [];
  }
}

export async function setOutputPriorityList(priorityList: string[]): Promise<void> {
  await LocalStorage.setItem(OUTPUT_PRIORITY_KEY, JSON.stringify(priorityList));
  await setPriorityListDirty(true);
}

export async function setInputPriorityList(priorityList: string[]): Promise<void> {
  await LocalStorage.setItem(INPUT_PRIORITY_KEY, JSON.stringify(priorityList));
  await setPriorityListDirty(false);
}

export async function getDeviceInfo(isOutput: boolean): Promise<StoredDeviceInfo[]> {
  try {
    const key = isOutput ? OUTPUT_DEVICE_INFO_KEY : INPUT_DEVICE_INFO_KEY;
    const stored = await LocalStorage.getItem<string>(key);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.log("Failed to parse device info, resetting:", error);
    const key = isOutput ? OUTPUT_DEVICE_INFO_KEY : INPUT_DEVICE_INFO_KEY;
    await LocalStorage.removeItem(key);
    return [];
  }
}

export async function saveDeviceInfo(devices: AudioDevice[], isOutput: boolean): Promise<void> {
  const key = isOutput ? OUTPUT_DEVICE_INFO_KEY : INPUT_DEVICE_INFO_KEY;
  const deviceInfo: StoredDeviceInfo[] = devices.map((device) => ({
    name: device.name,
    transportType: device.transportType,
  }));
  await LocalStorage.setItem(key, JSON.stringify(deviceInfo));
}

export function assignPriorityRanks(devices: AudioDevice[], priorityList: string[]): AudioDevice[] {
  return devices.map((device) => {
    const existingIndex = priorityList.findIndex((name) => name.toLowerCase() === device.name.toLowerCase());

    let priorityRank: number;

    if (existingIndex !== -1) {
      // Device is in existing priority list
      priorityRank = existingIndex + 1;
    } else {
      // Device not in priority list - assign to bottom
      priorityRank = priorityList.length + 1;
    }

    return {
      ...device,
      priorityRank,
    };
  });
}

export async function ensureAllDevicesInPriorityList(devices: AudioDevice[], isOutput: boolean): Promise<string[]> {
  const currentPriorityList = isOutput ? await getOutputPriorityList() : await getInputPriorityList();
  const allDeviceNames = devices.map((d) => d.name);

  // Add any missing devices to the end of the priority list
  const missingDevices = allDeviceNames.filter(
    (name) => !currentPriorityList.some((priorityName) => priorityName.toLowerCase() === name.toLowerCase()),
  );

  const updatedPriorityList = [...currentPriorityList, ...missingDevices];

  // Save the updated list if we added any devices
  if (missingDevices.length > 0) {
    if (isOutput) {
      await setOutputPriorityList(updatedPriorityList);
    } else {
      await setInputPriorityList(updatedPriorityList);
    }
  }

  return updatedPriorityList;
}

export async function isPriorityListDirty(isOutput: boolean): Promise<boolean> {
  const key = isOutput ? OUTPUT_PRIORITY_DIRTY_KEY : INPUT_PRIORITY_DIRTY_KEY;
  const value = await LocalStorage.getItem<string>(key);
  return value === "true";
}

export async function setPriorityListDirty(isOutput: boolean): Promise<void> {
  const key = isOutput ? OUTPUT_PRIORITY_DIRTY_KEY : INPUT_PRIORITY_DIRTY_KEY;
  await LocalStorage.setItem(key, "true");
}

export async function clearPriorityListDirty(isOutput: boolean): Promise<void> {
  const key = isOutput ? OUTPUT_PRIORITY_DIRTY_KEY : INPUT_PRIORITY_DIRTY_KEY;
  await LocalStorage.removeItem(key);
}
