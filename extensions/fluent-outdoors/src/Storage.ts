import { LocalStorage } from "@raycast/api";
import { BaseTrack, WithId } from "./types/common";

export class Storage<EntryType extends WithId> {
  constructor(private key: string) {}

  async addEntry(entry: EntryType) {
    const entries = await this.getEntries();

    // Add only if not there yet
    if (entries.find((existingEntry) => existingEntry.id === entry.id)) {
      return entries;
    }
    return this.setEntries(entries.concat([entry]));
  }

  async removeEntry(id: string) {
    const entries = await this.getEntries();
    return this.setEntries(entries.filter((entry) => entry.id !== id));
  }

  async getAll() {
    return this.getEntries();
  }

  async clearAll() {
    return LocalStorage.removeItem(this.key);
  }

  private async setEntries(entries: EntryType[]) {
    await LocalStorage.setItem(this.key, JSON.stringify(entries));
    return entries;
  }

  private async getEntries() {
    const data = await LocalStorage.getItem<string>(this.key);
    if (!data) {
      return [];
    }
    return JSON.parse(data) as EntryType[];
  }
}

export function getFavouriteTracksStorage() {
  return new Storage<BaseTrack>("favouriteTracks");
}
