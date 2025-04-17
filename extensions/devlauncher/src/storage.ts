import { LocalStorage } from "@raycast/api";

export class StorageService {
  constructor(private storageKey: string) {}

  async getItems(): Promise<string[]> {
    const itemsString = await LocalStorage.getItem<string>(this.storageKey);
    return itemsString ? itemsString.split(";") : [];
  }

  async addItem(item: string): Promise<void> {
    const items = await this.getItems();
    if (!items.includes(item)) {
      items.push(item);
      await this.saveItems(items);
    }
  }

  async removeItem(item: string): Promise<void> {
    const items = await this.getItems();
    const filteredItems = items.filter((i) => i !== item);
    await this.saveItems(filteredItems);
  }

  async clearItems(): Promise<void> {
    await LocalStorage.removeItem(this.storageKey);
  }

  async saveItems(items: string[]): Promise<void> {
    await LocalStorage.setItem(this.storageKey, items.join(";"));
  }
}
