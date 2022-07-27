import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { Preferences, moduleitem } from "./types";

const preferences: Preferences = getPreferenceValues();

export const getShowRecents = (): boolean => {
  return preferences.recent;
};

export const getNumRecents = (): number => {
  return parseInt(preferences.numRecent);
};

export const getRecentModuleItems = async (id: number): Promise<moduleitem[]> => {
  const json: string = (await LocalStorage.getItem(`${id}-recent-modules`)) || JSON.stringify([]);
  return JSON.parse(json).slice(0, getNumRecents());
};

export const appendRecentModuleItem = async (id: number, item: moduleitem): Promise<void> => {
  const json: string = (await LocalStorage.getItem(`${id}-recent-modules`)) || JSON.stringify([]);
  let items = JSON.parse(json);
  items = removeModuleItem(items, item);
  items.unshift(item);
  if (items.length > getNumRecents()) items.pop();
  await LocalStorage.setItem(`${id}-recent-modules`, JSON.stringify(items));
};

export const clearRecentModuleItems = async (id: number): Promise<void> => {
  await LocalStorage.setItem(`${id}-recent-modules`, JSON.stringify([]));
};

export const removeModuleItem = (array: moduleitem[], item: moduleitem): moduleitem[] => {
  return array.filter((i: moduleitem) => i.id !== item.id);
};
