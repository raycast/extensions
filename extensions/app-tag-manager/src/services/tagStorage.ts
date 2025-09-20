import { LocalStorage } from "@raycast/api";
import { TagStorage } from "../types";

export async function loadTags(): Promise<TagStorage> {
  const store = await LocalStorage.allItems();
  const tagMap: TagStorage = {};

  for (const [key, value] of Object.entries(store)) {
    try {
      tagMap[key] = JSON.parse(value);
    } catch {
      // 跳过无效的标签数据
    }
  }

  return tagMap;
}

export async function saveTags(appName: string, tags: string[]): Promise<void> {
  await LocalStorage.setItem(appName, JSON.stringify(tags));
}

export async function addTag(appName: string, currentTags: string[], newTag: string): Promise<string[]> {
  const updatedTags = [...new Set([...currentTags, newTag])];
  await saveTags(appName, updatedTags);
  return updatedTags;
}

export async function removeTag(appName: string, currentTags: string[], tagToRemove: string): Promise<string[]> {
  const updatedTags = currentTags.filter((tag) => tag !== tagToRemove);
  await saveTags(appName, updatedTags);
  return updatedTags;
}
