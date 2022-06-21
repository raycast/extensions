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
  const items = JSON.parse(json);
  remove(items, item);
  if (items.length < getNumRecents()) items.unshift(item);
  await LocalStorage.setItem(`${id}-recent-modules`, JSON.stringify(items));
};

export const clearRecentModuleItems = async (id: number): Promise<void> => {
  await LocalStorage.setItem(`${id}-recent-modules`, JSON.stringify([]));
};

export const remove = (array: any[], element: any): any[] => {
  const index = array.indexOf(element);
  if (index !== -1) {
    array.splice(index, 1);
  }
  return array;
};
