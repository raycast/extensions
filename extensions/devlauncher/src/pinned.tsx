import { StorageService } from "./storage";

export class PinnedProjectsService {
  private static readonly storage = new StorageService("pinned");

  static async pinItem(project: string) {
    await PinnedProjectsService.storage.addItem(project);
  }

  static async getPinned(): Promise<string[]> {
    return await PinnedProjectsService.storage.getItems();
  }

  static async clearPinnedItems() {
    await PinnedProjectsService.storage.clearItems();
  }

  static async removePinnedItem(project: string) {
    await PinnedProjectsService.storage.removeItem(project);
  }
}
