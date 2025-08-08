import { LocalStorage } from "@raycast/api";

export async function deleteBookmark(id: string): Promise<void> {
  await LocalStorage.removeItem(id);
}
