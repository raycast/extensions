import { LocalStorage } from "@raycast/api";
import { AthomCloudAPI } from "homey-api";

export class Storage extends AthomCloudAPI.StorageAdapter {
  async get(): Promise<any> {
    const data = await LocalStorage.getItem<string>("athom");
    return data ? JSON.parse(data) : {};
  }
  async set(value: any): Promise<void> {
    return LocalStorage.setItem("athom", JSON.stringify(value));
  }
}
