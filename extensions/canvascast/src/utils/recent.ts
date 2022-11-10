import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { Preferences, moduleitem } from "./types";

const preferences: Preferences = getPreferenceValues();
export const showRecent = preferences.showRecent;
const numRecent = parseInt(preferences.numRecent);

const getModuleItems = async (key: number, type: string): Promise<moduleitem[]> => {
  const json: string = (await LocalStorage.getItem(`${key}-${type}-moduleitems`)) || JSON.stringify([]);
  return JSON.parse(json);
};

export const getRecentModuleItems = async (key: number): Promise<moduleitem[]> => {
  return await getModuleItems(key, "recent");
};

export const getPinnedModuleItems = async (key: number): Promise<moduleitem[]> => {
  return await getModuleItems(key, "pinned");
};

const appendModuleItem = async (key: number, type: string, item: moduleitem, limit = false): Promise<void> => {
  let items = await getModuleItems(key, type);
  items = removeItem(items, item.id);
  items.unshift(item);
  if (limit && items.length >= numRecent) items.pop();
  await LocalStorage.setItem(`${key}-${type}-moduleitems`, JSON.stringify(items));
};

export const appendRecentModuleItem = async (key: number, item: moduleitem): Promise<void> => {
  const pinned = await getPinnedModuleItems(key);
  if (pinned.some((i) => i.id === item.id)) return;
  await appendModuleItem(key, "recent", item, true);
};

export const appendPinnedModuleItem = async (key: number, item: moduleitem): Promise<void> => {
  await removeRecentModuleItem(key, item.id);
  await appendModuleItem(key, "pinned", item);
};

export const clearRecentModuleItems = async (key: number): Promise<void> => {
  await LocalStorage.setItem(`${key}-recent-moduleitems`, JSON.stringify([]));
};

export const clearPinnedModuleItems = async (key: number): Promise<void> => {
  await LocalStorage.setItem(`${key}-pinned-moduleitems`, JSON.stringify([]));
};

const removeItem = (array: moduleitem[], id: string): moduleitem[] => {
  return array.filter((i: moduleitem) => i.id !== id);
};

const removeModuleItem = async (key: number, type: string, id: string): Promise<void> => {
  let items = await getModuleItems(key, type);
  items = removeItem(items, id);
  await LocalStorage.setItem(`${key}-${type}-moduleitems`, JSON.stringify(items));
};

export const removeRecentModuleItem = async (key: number, id: string): Promise<void> => {
  await removeModuleItem(key, "recent", id);
};

export const removePinnedModuleItem = async (key: number, id: string): Promise<void> => {
  await removeModuleItem(key, "pinned", id);
};

export const isTopPinnedModuleItem = async (key: number, id: string): Promise<boolean> => {
  const pinned = await getPinnedModuleItems(key);
  return pinned.length > 0 && pinned[0].id === id;
};

export const isBottomPinnedModuleItem = async (key: number, id: string): Promise<boolean> => {
  const pinned = await getPinnedModuleItems(key);
  return pinned.length > 0 && pinned[pinned.length - 1].id === id;
};

export const moveUpPinnedModuleItem = async (key: number, id: string | undefined) => {
  const pinned = await getPinnedModuleItems(key);
  const index = pinned.findIndex((i) => i.id === id);
  pinned.splice(index - 1, 2, pinned[index], pinned[index - 1]);
  await LocalStorage.setItem(`${key}-pinned-moduleitems`, JSON.stringify(pinned));
};

export const moveDownPinnedModuleItem = async (key: number, id: string | undefined) => {
  const pinned = await getPinnedModuleItems(key);
  const index = pinned.findIndex((i) => i.id === id);
  pinned.splice(index, 2, pinned[index + 1], pinned[index]);
  await LocalStorage.setItem(`${key}-pinned-moduleitems`, JSON.stringify(pinned));
};
