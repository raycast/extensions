import { LocalStorage, showHUD } from "@raycast/api";

export async function clearCache() {
  await Promise.all([LocalStorage.removeItem("obsidian-files"), LocalStorage.removeItem("obsidian-tags")]);
  await showHUD("Cache cleared");
}
