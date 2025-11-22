import { LocalStorage } from "@raycast/api";

export const getSlotMapping = async (): Promise<Record<string, string>> => {
  const items = await LocalStorage.allItems();
  return items;
};

export const saveSlotMapping = async (slot: number, profileDirectory: string) => {
  await LocalStorage.setItem(`slot_${slot}`, profileDirectory);
};

export const removeSlotMapping = async (slot: number) => {
  await LocalStorage.removeItem(`slot_${slot}`);
};

export const getProfileForSlot = async (slot: number): Promise<string | undefined> => {
  const item = await LocalStorage.getItem<string>(`slot_${slot}`);
  return item;
};
