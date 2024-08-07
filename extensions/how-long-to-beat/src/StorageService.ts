import { LocalStorage } from "@raycast/api";

export class StorageService {
  static async getHashToken(): Promise<string | null> {
    const hash = await LocalStorage.getItem<string>("hashToken");
    return hash ?? null; // Convert undefined to null
  }

  static async setHashToken(hash: string): Promise<void> {
    LocalStorage.setItem("hashToken", hash);
  }
}
