import { LocalStorage } from "@raycast/api";
import { Item, EnhancedItem } from "./types";
import { DEFAULT_KEY, FASTING_DURATION_MS } from "./constants";
import uniqid from "uniqid";

function enhanceItem(item: Item): EnhancedItem {
  // Ensure dates are properly converted from strings
  const start = item.start instanceof Date ? item.start : new Date(item.start);
  const end = item.end ? (item.end instanceof Date ? item.end : new Date(item.end)) : null;

  const now = new Date();
  const elapsedTime = now.getTime() - start.getTime();
  const fastingDuration = item.fastingDuration || FASTING_DURATION_MS;
  const progress = Math.min(Math.max(elapsedTime / fastingDuration, 0), 1);

  const endTime = new Date(start.getTime() + fastingDuration);
  const remainingTime = endTime.getTime() - now.getTime();
  const remainingHours = Math.floor(remainingTime / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));

  const enhanced: EnhancedItem = {
    ...item,
    start, // Use the converted date
    end, // Use the converted date
    progress,
    remainingTime,
    remainingHours,
    remainingMinutes,
  };

  if (end) {
    enhanced.fastDuration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60));
  }

  return enhanced;
}

export async function getItems(key = DEFAULT_KEY): Promise<EnhancedItem[]> {
  const items = await LocalStorage.getItem<string>(key);
  if (!items) return [];

  const parsedItems = JSON.parse(items) as Item[];
  return parsedItems.map(enhanceItem).sort((a, b) => b.start.getTime() - a.start.getTime());
}

export async function saveItems(items: EnhancedItem[], key = DEFAULT_KEY) {
  await LocalStorage.setItem(
    key,
    JSON.stringify(
      items.map((item) => ({
        id: item.id,
        start: item.start,
        end: item.end,
        notes: item.notes,
        mood: item.mood,
        fastingDuration: item.fastingDuration,
      })),
    ),
  );
}

export async function addItem(item: Item, key = DEFAULT_KEY) {
  let items = await getItems(key);

  // Use a single map operation to update or add the item
  items = items.map((i) => (i.id === item.id ? enhanceItem(item) : i));
  if (!items.some((i) => i.id === item.id)) {
    items.push(enhanceItem(item));
  }

  await saveItems(items, key);
  return items;
}

export async function deleteItem(item: Item, key = DEFAULT_KEY) {
  let items = await getItems(key);
  items = items.filter((i) => i.id !== item.id);
  await saveItems(items, key);
  return items;
}

export async function clear() {
  await LocalStorage.clear();
}

export async function startItem(key = DEFAULT_KEY): Promise<EnhancedItem[]> {
  let items = await getItems(key);
  const now = new Date();

  // If there's an active fast, don't start a new one
  if (items.some((item) => item.end === null)) {
    return items;
  }

  const newItem: Item = {
    id: uniqid(),
    start: now,
    end: null,
    fastingDuration: FASTING_DURATION_MS,
  };

  const enhancedNewItem = enhanceItem(newItem);
  items = [enhancedNewItem, ...items];
  await saveItems(items, key);

  return getItems(key);
}

export async function updateItem(itemId: string, updates: Partial<EnhancedItem>, key = DEFAULT_KEY) {
  const items = await getItems(key);
  const itemIndex = items.findIndex((item) => item.id === itemId);

  if (itemIndex !== -1) {
    const updatedItem = { ...items[itemIndex], ...updates };
    const allItems = items.map((item) => (item.id === itemId ? updatedItem : item));
    await saveItems(allItems, key);
  }
}

export async function mergeItems(importedItems: EnhancedItem[]): Promise<number> {
  const existingItems = await getItems();
  const existingIds = new Set(existingItems.map((item) => item.id));
  const newItems = importedItems.filter((item) => !existingIds.has(item.id));
  const combinedItems = [...existingItems, ...newItems];

  await saveItems(combinedItems);

  return newItems.length;
}
