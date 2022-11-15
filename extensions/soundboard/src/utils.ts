import { exec } from "child_process";
import { Item } from "./types";
import { getItem, getItems, saveItems } from "./storage";
import { launchCommand, LaunchType } from "@raycast/api";

export const playSoundFromIndex = async (index: number) => {
  const sound = await getItem(index);
  if (sound) {
    await playFile(sound);
    return;
  }

  launchCommand({ name: "index", type: LaunchType.UserInitiated, context: { index: index } });
};

export const playFile = async (item: Item) => {
  exec(`afplay ${item.path} && $$`);
};

export const addItem = async (item: Item) => {
  let items: Item[] = await getItems();
  items = items.filter((i) => i.id !== item.id);
  items.push(item);

  await saveItems(items);

  return items;
};

export const removeItemEntry = async (item: Item) => {
  let items: Item[] = await getItems();
  items = items.filter((i) => i.id !== item.id);

  await saveItems(items);

  return items;
};
