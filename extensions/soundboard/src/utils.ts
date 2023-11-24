import { exec } from "child_process";
import { Item } from "./types";
import { getItem, getItems, saveItems } from "./storage";
import { environment, launchCommand, LaunchType, updateCommandMetadata } from "@raycast/api";

export const playSoundFromIndex = async (index: number) => {
  const sound = await getItem(index);
  if (sound) {
    if (environment.launchType === LaunchType.UserInitiated) {
      await playFile(sound);
    }

    await updateCommandMetadata({ subtitle: `Sound Name: ${sound.title}` });
    return;
  }

  if (environment.launchType === LaunchType.UserInitiated) {
    launchCommand({ name: "index", type: LaunchType.UserInitiated, context: { index: index } });
  }

  await updateCommandMetadata({ subtitle: "Soundboard" });
};

export const playFile = async (item: Item) => {
  exec(`afplay "${item.path}" && $$`);
};

export const updateFavoriteSubtitles = async (item: Item) => {
  if (item.favourite !== "0") {
    await launchCommand({ name: `favorite${item.favourite}`, type: LaunchType.Background });
  }

  if (item.last_favourite && item.last_favourite !== "0") {
    await launchCommand({ name: `favorite${item.last_favourite}`, type: LaunchType.Background });
  }
};

export const addItem = async (item: Item) => {
  let items: Item[] = await getItems();

  // Figure out if items favourite already exists in items
  const alreadyAssignedItem = items.find((i) => i.favourite === item.favourite && i.id !== item.id);
  if (alreadyAssignedItem) {
    items = items.map((i) => {
      if (i.favourite === item.favourite) {
        i.favourite = "0";
      }
      return i;
    });
  }

  // Figure out if item.id already exists in items and is so, replace it else add it
  const alreadyExists = items.find((i) => i.id === item.id);
  if (alreadyExists) {
    items = items.map((i) => {
      return i.id === item.id ? item : i;
    });
  } else {
    items.push(item);
  }

  await saveItems(items);
  await updateFavoriteSubtitles(item);

  return items;
};

export const removeItemEntry = async (item: Item) => {
  let items: Item[] = await getItems();
  items = items.filter((i) => i.id !== item.id);

  await saveItems(items);
  await updateFavoriteSubtitles(item);

  return items;
};
