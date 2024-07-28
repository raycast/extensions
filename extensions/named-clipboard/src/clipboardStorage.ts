import { LocalStorage } from "@raycast/api";

export async function saveClipboardItem(name: string, content: string): Promise<void> {
  const clipboardItems = await getClipboardItems();
  clipboardItems[name] = content;
  await LocalStorage.setItem("clipboards", JSON.stringify(clipboardItems));
}

export async function getClipboardItems(): Promise<Record<string, string>> {
  const items = await LocalStorage.getItem<string>("clipboards");
  return items ? JSON.parse(items) : {};
}

export async function deleteClipboardItem(name: string): Promise<void> {
  const clipboardItems = await getClipboardItems();
  delete clipboardItems[name];
  await LocalStorage.setItem("clipboards", JSON.stringify(clipboardItems));
}

export async function getClipboardItem(name: string): Promise<string | null> {
  const clipboardItems = await getClipboardItems();
  return clipboardItems[name] || null;
}
