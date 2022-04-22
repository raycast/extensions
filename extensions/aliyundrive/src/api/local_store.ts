import { LocalStorage } from "@raycast/api";

export class LocalStore {
  private readonly key: string;

  constructor(key: string) {
    this.key = key;
  }

  async load(): Promise<string> {
    return (await LocalStorage.getItem(this.key)) || "";
  }

  async dump(data: string): Promise<void> {
    return await LocalStorage.setItem(this.key, data);
  }

  async clean(): Promise<void> {
    return await LocalStorage.removeItem(this.key);
  }
}

export const tokenStore = new LocalStore("token");
export const cookieStore = new LocalStore("cookie");
