import { LocalStorage } from "@raycast/api";
import { Palette } from "../models/palette.model";

export class StorageService {
  static jsonDateReviver(key: string, value: any): Date | any {
    const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,}|)Z$/;

    if (typeof value === "string" && dateFormat.test(value)) {
      return new Date(value);
    }

    return value;
  }
  static async allPalettes(): Promise<Palette[]> {
    const items = await LocalStorage.allItems();
    return Object.values(items).map((item) => JSON.parse(item, StorageService.jsonDateReviver) as Palette);
  }

  static async savePalette(palette: Palette): Promise<void> {
    await LocalStorage.setItem(`${palette.name}`, JSON.stringify(palette));
  }

  static async removePalette(palette: Palette): Promise<void> {
    await LocalStorage.removeItem(`${palette.name}`);
  }

  static async clearAllPalettes(): Promise<void> {
    await LocalStorage.clear();
  }
}
